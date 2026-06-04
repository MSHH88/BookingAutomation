/**
 * Shared template renderer — Phase 1, Step 1.1
 *
 * Provides a safe Handlebars-style variable interpolation engine used by
 * WhatsApp, Email, and SMS template services.
 *
 * Security:
 *  - Only `{{variableName}}` placeholders are supported (no helpers, no partials,
 *    no block expressions).  This prevents template-injection attacks where a
 *    malicious template body executes arbitrary Handlebars helpers.
 *  - Unknown variables are replaced with an empty string (no error thrown).
 *  - HTML-special characters in variable values are NOT escaped for WhatsApp/SMS
 *    (plain text channels).  The Email renderer uses Handlebars directly and
 *    escapes by default.
 *
 * Usage:
 *   import { renderTemplate } from '../../lib/template-renderer';
 *   const body = renderTemplate('Hi {{customerName}}!', { customerName: 'Jane' });
 *   // → 'Hi Jane!'
 */

import { logger } from '../utils/logger';

/**
 * Regex that matches `{{variableName}}` placeholders.
 * Allows: letters, digits, underscores — matching typical variable naming.
 * Whitespace inside braces is tolerated: `{{ name }}` works.
 */
const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g;

/**
 * Interpolates `{{variable}}` placeholders in a template string.
 *
 * @param template  - The template body containing `{{variable}}` placeholders.
 * @param variables - Key-value map of variable names to their string values.
 * @returns The rendered string with all placeholders replaced.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
): string {
  return template.replace(PLACEHOLDER_RE, (_match: string, varName: string): string => {
    const value = variables[varName];
    if (value === undefined || value === null) {
      logger.debug('Template variable not provided, using empty string', { varName });
      return '';
    }
    return String(value);
  });
}
