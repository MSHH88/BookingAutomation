import { createLogger, format, transports } from 'winston';
import { config } from '../config/index';

const { combine, timestamp, colorize, printf, json, errors } = format;

// ─── Dev format — human-readable, colorised ──────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }), // include stack traces for Error objects
  printf((info) => {
    const ts = info['timestamp'] as string;
    const level = info.level;
    const msg = (info['stack'] as string | undefined) ?? info.message;

    // Everything that isn't a standard field becomes trailing metadata
    const knownKeys = new Set(['level', 'message', 'timestamp', 'stack', 'splat']);
    const meta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(info as Record<string, unknown>)) {
      if (!knownKeys.has(k)) meta[k] = v;
    }
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';

    return `${ts} [${level}] ${msg}${metaStr}`;
  }),
);

// ─── Prod format — structured JSON (consumed by Datadog, CloudWatch, etc.) ───
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const logger = createLogger({
  level: config.LOG_LEVEL,
  format: config.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new transports.Console()],
  /**
   * Do NOT let Winston call process.exit on uncaught exceptions —
   * server.ts registers its own graceful-shutdown handlers for that.
   */
  exitOnError: false,
  /**
   * Silence all output during automated tests to keep jest output clean.
   */
  silent: config.NODE_ENV === 'test',
});
