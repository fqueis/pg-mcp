import type { ConnectionEntry } from '@interfaces/connection-entry.interface.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';

/**
 * A registered connection together with its open pool. Internal to the service.
 */
export interface ActiveConnection {
  /** The registry entry, renewed by this use. */
  entry: ConnectionEntry;
  /** The open pool for the entry. */
  pool: DatabasePool;
}
