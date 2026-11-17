import type { DatabasePool } from '@interfaces/database-pool.interface.js';

/**
 * Creates a pool for a resolved connection string. Injected into the service so
 * tests can replace the driver.
 *
 * @param connectionString - Full `postgres://` connection string, secret included.
 */
export type PoolFactory = (connectionString: string) => DatabasePool;
