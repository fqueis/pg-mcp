import { Pool } from 'pg';

import { POOL_CONNECTION_TIMEOUT_MS, POOL_IDLE_TIMEOUT_MS, POOL_MAX_CONNECTIONS } from '@constants/pool.constants.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';

/**
 * Creates a `pg` connection pool for a resolved connection string. This is the
 * production {@link PoolFactory}; the pool is created lazily, so no connection
 * opens until the first statement.
 *
 * @param connectionString - Full `postgres://` connection string, secret included.
 * @returns A pool limited in size, with idle and connect timeouts.
 */
export function createPgPool(connectionString: string): DatabasePool {
  const pool = new Pool({
    connectionString,
    max: POOL_MAX_CONNECTIONS,
    idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
  });
  // An idle connection dropped by the server emits `error` on the pool; without a listener
  // it would crash the whole MCP process. The next statement reconnects on its own.
  pool.on('error', () => undefined);
  return pool;
}
