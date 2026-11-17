import type { ConnectionRegistryService } from '@services/connection-registry.service.js';
import type { WritePolicyService } from '@services/write-policy.service.js';
import type { PoolFactory } from '@app-types/pool-factory.type.js';

/**
 * Dependencies and limits of `PgMcpService`.
 */
export interface PgMcpServiceOptions {
  /** Persistent store of registered connections. */
  registry: ConnectionRegistryService;
  /** Creates a pool for a resolved connection string; the driver boundary. */
  createPool: PoolFactory;
  /** Environment read by `env` credential sources; defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Upper bound of rows a query returns; a caller may ask for fewer, never more. */
  maxRows: number;
  /** Time, in milliseconds, after which the server cancels a running statement. */
  statementTimeoutMs: number;
  /** Decides whether a statement that changes data may run. */
  writePolicy: WritePolicyService;
}
