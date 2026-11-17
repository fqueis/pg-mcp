import type { DatabaseClient } from '@interfaces/database-client.interface.js';
import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * The slice of a PostgreSQL connection pool the service depends on. This is
 * the boundary to the driver: production code wires `pg.Pool`, tests wire a fake.
 */
export interface DatabasePool {
  /**
   * Runs one statement on any pooled connection, outside an explicit transaction.
   *
   * @param text - SQL text.
   * @param params - Positional parameters for `$1`, `$2`, and so on.
   * @returns The query result.
   */
  query(text: string, params?: unknown[]): Promise<QueryResult>;

  /**
   * Checks out one connection so several statements share a transaction.
   *
   * @returns A client that must be released after use.
   */
  connect(): Promise<DatabaseClient>;

  /** Closes every connection in the pool. */
  end(): Promise<void>;
}
