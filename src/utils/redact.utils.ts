import { REDACTED_MASK, URL_PASSWORD_PATTERN } from '@constants/redact.constants.js';

/**
 * Masks credentials in free text so a password never reaches a tool result,
 * an error message, or a log line.
 *
 * Replaces the password segment of every `scheme://user:password@host` URL
 * with `***`, then replaces every literal occurrence of each known secret.
 *
 * @param text - Any text that may contain connection strings.
 * @param secrets - Extra literal values to mask wherever they appear. Empty strings are ignored.
 * @returns The same text with credentials masked.
 * @example
 * ```typescript
 * redactSecrets('postgres://app:s3cret@db/shop'); // 'postgres://app:***@db/shop'
 * redactSecrets('password=s3cret', ['s3cret']); // 'password=***'
 * ```
 */
export function redactSecrets(text: string, secrets: readonly string[] = []): string {
  let result = text.replace(URL_PASSWORD_PATTERN, `$1${REDACTED_MASK}$3`);
  for (const secret of secrets) {
    if (secret) result = result.split(secret).join(REDACTED_MASK);
  }
  return result;
}
