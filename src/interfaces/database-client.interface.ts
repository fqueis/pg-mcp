import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * A single checked-out database connection, used to run statements inside one
 * transaction.
 */
export interface DatabaseClient {
  /**
   * Runs one statement on this connection.
   *
   * @param text - SQL text.
   * @param params - Positional parameters for `$1`, `$2`, and so on.
   * @returns The query result.
   */
  query(text: string, params?: unknown[]): Promise<QueryResult>;

  /** Returns the connection to its pool. Must be called exactly once. */
  release(): void;
}
