/**
 * Matches `scheme://user:password@` and captures the prefix, the password, and
 * the `@`, so the password can be replaced while the rest is kept.
 */
export const URL_PASSWORD_PATTERN = /(\b[a-z][a-z0-9+.-]*:\/\/[^:/@\s]*:)([^@\s]*)(@)/gi;

/** Replacement shown in place of a masked secret. */
export const REDACTED_MASK = '***';
