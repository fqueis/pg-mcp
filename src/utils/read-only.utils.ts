import {
  SQL_BEGIN_READ_ONLY,
  SQL_CURSOR_CANDIDATE_PATTERN,
  SQL_DECLARE_CURSOR_PREFIX,
  SQL_FETCH_CURSOR_SUFFIX,
  SQL_FETCH_FORWARD_PREFIX,
  SQL_ROLLBACK,
  SQL_SET_STATEMENT_TIMEOUT_PREFIX,
} from '@constants/sql.constants.js';
import type { DatabaseClient } from '@interfaces/database-client.interface.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';
import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * Opens a `READ ONLY` transaction with a statement timeout on a checked-out connection.
 *
 * @param client - The connection to open the transaction on.
 * @param statementTimeoutMs - Milliseconds after which the server cancels a statement.
 */
async function beginReadOnly(client: DatabaseClient, statementTimeoutMs: number): Promise<void> {
  await client.query(SQL_BEGIN_READ_ONLY);
  await client.query(`${SQL_SET_STATEMENT_TIMEOUT_PREFIX}${Math.trunc(statementTimeoutMs)}`);
}

/**
 * Reads at most `fetchLimit` rows of a statement through a server-side cursor, so
 * the server never hands over, and the process never holds, the rest of a large result.
 *
 * @param client - A connection inside an open read-only transaction.
 * @param sql - The statement to run.
 * @param params - Values bound to the positional placeholders.
 * @param fetchLimit - Maximum number of rows to read.
 * @returns The rows read, or `undefined` when the statement cannot be declared as a cursor.
 *   Statements such as `SHOW` or `EXPLAIN`, invalid SQL, and data-modifying `WITH` cannot, and the failed
 *   declaration aborts the transaction. Errors raised while reading the rows are not swallowed.
 */
async function fetchBounded(
  client: DatabaseClient,
  sql: string,
  params: unknown[] | undefined,
  fetchLimit: number,
): Promise<QueryResult | undefined> {
  try {
    await client.query(`${SQL_DECLARE_CURSOR_PREFIX}${sql}`, params);
  } catch {
    return undefined;
  }
  return client.query(`${SQL_FETCH_FORWARD_PREFIX}${Math.trunc(fetchLimit)}${SQL_FETCH_CURSOR_SUFFIX}`);
}

/**
 * Runs one statement inside a `READ ONLY` transaction that is always rolled back.
 *
 * The server enforces read-only mode, so a write statement fails regardless of
 * how the SQL is phrased. The connection goes back to the pool even when the
 * statement fails.
 *
 * With a `fetchLimit`, a statement that can be read as a cursor (see
 * `SQL_CURSOR_CANDIDATE_PATTERN`) is read through one and at most that many rows come
 * back. Any other statement runs directly. A candidate the server still refuses as a
 * cursor runs directly in a fresh transaction, so its own result or error is what the
 * caller sees.
 *
 * @param pool - Pool to check a connection out of.
 * @param sql - The statement to run.
 * @param params - Values bound to the positional placeholders.
 * @param statementTimeoutMs - Milliseconds after which the server cancels the statement.
 * @param fetchLimit - Maximum rows to read; omit it to read the whole result.
 * @returns The statement result.
 */
export async function runInReadOnlyTransaction(
  pool: DatabasePool,
  sql: string,
  params: unknown[] | undefined,
  statementTimeoutMs: number,
  fetchLimit?: number,
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    await beginReadOnly(client, statementTimeoutMs);

    if (fetchLimit !== undefined && SQL_CURSOR_CANDIDATE_PATTERN.test(sql)) {
      const bounded = await fetchBounded(client, sql, params, fetchLimit);
      if (bounded) return bounded;
      await client.query(SQL_ROLLBACK);
      await beginReadOnly(client, statementTimeoutMs);
    }

    return await client.query(sql, params);
  } finally {
    try {
      await client.query(SQL_ROLLBACK);
    } finally {
      client.release();
    }
  }
}
