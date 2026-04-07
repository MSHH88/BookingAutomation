/**
 * Resend singleton — Step 1.15
 *
 * Configures and exports a single Resend client instance shared across the
 * entire application. Centralising the client here means:
 *
 *  1. Credentials are loaded from `config` once at startup.
 *  2. Tests mock only this module — no need to intercept the resend package.
 *  3. Future credential rotation only requires a change in one place.
 *
 * When `RESEND_API_KEY` is absent (local dev / CI without email):
 *   The client is still constructed — calls will fail at runtime with an
 *   authentication error from Resend, which is the correct behaviour.
 *   Tests mock this module entirely and never reach the Resend API.
 *
 * Usage:
 *   import { resend } from '../../lib/resend';
 *   await resend.emails.send({ from, to, subject, html });
 */
import { Resend } from 'resend';

import { config } from '../config';

export const resend = new Resend(config.RESEND_API_KEY || 'resend_placeholder');
