import type { WritePolicyModeType } from '@constants/write-policy.constants.js';

/**
 * Server settings resolved from the environment.
 */
export interface AppConfig {
  /** Absolute path of the registry file. */
  registryPath: string;
  /** Sliding time-to-live of a registered connection, in milliseconds. */
  registryTtlMs: number;
  /** Whether writes are refused, asked about, or allowed. */
  writeMode: WritePolicyModeType;
  /** Upper bound of rows a query returns. */
  maxRows: number;
  /** Milliseconds after which the server cancels a running statement. */
  statementTimeoutMs: number;
}
