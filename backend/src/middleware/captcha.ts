/**
 * CAPTCHA verification middleware — Phase 2.3
 *
 * Validates hCaptcha or Cloudflare Turnstile tokens on public endpoints.
 * When `PUBLIC_CAPTCHA_ENABLED` feature flag is OFF **and** `CAPTCHA_ENABLED`
 * env var is false, the middleware is a no-op.
 *
 * Supports two providers:
 *   - hCaptcha (default):     CAPTCHA_PROVIDER=hcaptcha
 *   - Cloudflare Turnstile:   CAPTCHA_PROVIDER=turnstile
 *
 * Expects the CAPTCHA response token in the request body as `captchaToken`.
 * If the token is missing or verification fails, the request is rejected with 400.
 *
 * Environment variables:
 *   CAPTCHA_ENABLED   — legacy env-var flag (default: "false")
 *   CAPTCHA_PROVIDER  — "hcaptcha" | "turnstile" (default: "hcaptcha")
 *   CAPTCHA_SECRET    — server-side secret key from the CAPTCHA provider
 *
 * Feature flag:
 *   PUBLIC_CAPTCHA_ENABLED — runtime-toggleable via Control Centre (checked first)
 *
 * Note: RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX are infrastructure-level env-var
 * settings that require a process restart to take effect. They are intentionally
 * NOT managed as runtime feature flags.
 */
import { Request, Response, NextFunction } from 'express';
import https from 'https';

import { config }   from '../config';
import { AppError } from '../errors/AppError';
import { logger }   from '../utils/logger';
import { isFeatureEnabled } from '../middleware/requireFeature';

// ─── Provider config ──────────────────────────────────────────────────────────

interface ProviderConfig {
  verifyUrl: string;
  secretParam: string;
  tokenParam: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  hcaptcha: {
    verifyUrl:   'https://hcaptcha.com/siteverify',
    secretParam: 'secret',
    tokenParam:  'response',
  },
  turnstile: {
    verifyUrl:   'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    secretParam: 'secret',
    tokenParam:  'response',
  },
};

// ─── Internal: verify token with provider ─────────────────────────────────────

async function verifyCaptchaToken(token: string, remoteIp?: string): Promise<boolean> {
  const provider = config.CAPTCHA_PROVIDER;
  const secret   = config.CAPTCHA_SECRET;
  const cfg      = PROVIDERS[provider] ?? PROVIDERS['hcaptcha'];

  const params = new URLSearchParams();
  params.append(cfg.secretParam, secret);
  params.append(cfg.tokenParam, token);
  if (remoteIp) params.append('remoteip', remoteIp);

  return new Promise<boolean>((resolve) => {
    const postData = params.toString();
    const url = new URL(cfg.verifyUrl);

    const req = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname,
        method:   'POST',
        timeout:  5000,
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length':  Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          try {
            const result = JSON.parse(body) as { success?: boolean };
            resolve(result.success === true);
          } catch {
            logger.error('CAPTCHA response parse error', { body });
            resolve(false);
          }
        });
      },
    );

    req.on('timeout', () => {
      logger.error('CAPTCHA verification request timed out');
      req.destroy();
      resolve(false);
    });

    req.on('error', (err: Error) => {
      logger.error('CAPTCHA verification request failed', { error: err.message });
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express middleware that verifies the CAPTCHA token in `req.body.captchaToken`.
 * Checks `PUBLIC_CAPTCHA_ENABLED` feature flag first, falls back to env-var
 * `CAPTCHA_ENABLED`. When both are false, the middleware passes through.
 */
export function requireCaptcha(req: Request, _res: Response, next: NextFunction): void {
  // Check the runtime feature flag first (async), fall back to env-var
  isFeatureEnabled('PUBLIC_CAPTCHA_ENABLED')
    .then((flagEnabled) => {
      const enabled = flagEnabled || config.CAPTCHA_ENABLED;

      if (!enabled) {
        next();
        return;
      }

      const token = (req.body as Record<string, unknown>)?.captchaToken;

      if (!token || typeof token !== 'string') {
        next(new AppError(400, 'CAPTCHA_REQUIRED', 'Missing captchaToken in request body'));
        return;
      }

      const remoteIp = req.ip ?? undefined;

      verifyCaptchaToken(token, remoteIp)
        .then((valid) => {
          if (!valid) {
            next(new AppError(400, 'CAPTCHA_FAILED', 'CAPTCHA verification failed'));
            return;
          }
          next();
        })
        .catch((err: Error) => {
          logger.error('CAPTCHA verification error', { error: err.message });
          next(new AppError(500, 'CAPTCHA_ERROR', 'CAPTCHA verification service unavailable'));
        });
    })
    .catch((err: Error) => {
      logger.error('CAPTCHA feature flag check failed', { error: err.message });
      // Fall back to env-var check on flag lookup failure
      if (!config.CAPTCHA_ENABLED) {
        next();
        return;
      }
      next(new AppError(500, 'CAPTCHA_ERROR', 'CAPTCHA configuration unavailable'));
    });
}
