import type { ConnectionTarget } from '@interfaces/connection-target.interface.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';

/**
 * A verified connection that is ready to be registered and used. Internal to the
 * service: it holds the live pool.
 */
export interface OpenedConnection {
  /** Pool opened with the resolved connection string. */
  pool: DatabasePool;
  /** Non-secret description of the database. */
  target: ConnectionTarget;
  /** Id derived from the target, used when the caller does not choose one. */
  derivedId: string;
  /** Server version reported while verifying the connection. */
  serverVersion: string;
}
