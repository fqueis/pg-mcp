import { SQL_BEGIN_READ_ONLY, SQL_ROLLBACK, SQL_SET_STATEMENT_TIMEOUT_PREFIX } from '@constants/sql.constants.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';
import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * Runs one statement inside a `READ ONLY` transaction that is always rolled back.
 *
 * The server enforces read-only mode, so a write statement fails regardless of
 * how the SQL is phrased. The connection goes back to the pool even when the
 * statement fails.
 *
 * @param pool - Pool to check a connection out of.
 * @param sql - The statement to run.
 * @param params - Values bound to the positional placeholders.
 * @param statementTimeoutMs - Milliseconds after which the server cancels the statement.
 * @returns The statement result.
 */
export async function runInReadOnlyTransaction(
  pool: DatabasePool,
  sql: string,
  params: unknown[] | undefined,
  statementTimeoutMs: number,
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    await client.query(SQL_BEGIN_READ_ONLY);
    await client.query(`${SQL_SET_STATEMENT_TIMEOUT_PREFIX}${Math.trunc(statementTimeoutMs)}`);
    return await client.query(sql, params);
  } finally {
    try {
      await client.query(SQL_ROLLBACK);
    } finally {
      client.release();
    }
  }
}
