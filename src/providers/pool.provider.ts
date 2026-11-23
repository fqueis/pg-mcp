import { Pool } from 'pg';
import type { PoolClient } from 'pg';

import {
  POOL_CONNECTION_TIMEOUT_MS,
  POOL_IDLE_TIMEOUT_MS,
  POOL_MAX_CONNECTIONS,
  POOL_QUERY_MODE_EXTENDED,
} from '@constants/pool.constants.js';
import type { DatabaseClient } from '@interfaces/database-client.interface.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';
import type { ExtendedQueryConfig } from '@interfaces/extended-query-config.interface.js';

/**
 * Wraps a checked-out connection so every statement it runs is parsed as exactly one statement.
 *
 * Without this, SQL text with no parameters travels as a simple query, and the server runs every
 * statement in it. A `COMMIT` in the middle would then end the `READ ONLY` transaction the service
 * opened, and whatever follows would run with write access. The server refuses a text that holds
 * more than one statement when it is sent this way.
 *
 * @param client - Connection checked out of the pool.
 * @returns The same connection, limited to one statement per call.
 */
function toSingleStatementClient(client: PoolClient): DatabaseClient {
  return {
    query: (text, params) => {
      const config: ExtendedQueryConfig = { text, values: params, queryMode: POOL_QUERY_MODE_EXTENDED };
      return client.query(config);
    },
    release: () => {
      client.release();
    },
  };
}

/**
 * Creates a `pg` connection pool for a resolved connection string. This is the
 * production {@link PoolFactory}; the pool is created lazily, so no connection
 * opens until the first statement.
 *
 * @param connectionString - Full `postgres://` connection string, secret included.
 * @returns A pool limited in size, with idle and connect timeouts, whose checked-out connections run one statement per call.
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
  return {
    query: (text, params) => pool.query(text, params),
    connect: async () => toSingleStatementClient(await pool.connect()),
    end: () => pool.end(),
  };
}
