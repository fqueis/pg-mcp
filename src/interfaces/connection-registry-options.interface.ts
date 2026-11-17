/**
 * Options for `ConnectionRegistryService`.
 */
export interface ConnectionRegistryOptions {
  /** Absolute path of the JSON registry file. */
  filePath: string;
  /** Sliding time-to-live, in milliseconds, measured from `lastUsedAt`. */
  ttlMs: number;
  /** Clock source; injected so expiry is testable. */
  now: () => number;
}
