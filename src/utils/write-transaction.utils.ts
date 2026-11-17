import { SQL_BEGIN, SQL_COMMIT, SQL_ROLLBACK, SQL_SET_STATEMENT_TIMEOUT_PREFIX } from '@constants/sql.constants.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';
import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * Runs one statement in a read-write transaction: committed when it succeeds,
 * rolled back when it fails. The connection goes back to the pool either way.
 *
 * @param pool - Pool to check a connection out of.
 * @param sql - The statement to run.
 * @param params - Values bound to the positional placeholders.
 * @param statementTimeoutMs - Milliseconds after which the server cancels the statement.
 * @returns The statement result.
 * @throws The statement's own error, after the transaction was rolled back.
 */
export async function runInWriteTransaction(
  pool: DatabasePool,
  sql: string,
  params: unknown[] | undefined,
  statementTimeoutMs: number,
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    await client.query(SQL_BEGIN);
    await client.query(`${SQL_SET_STATEMENT_TIMEOUT_PREFIX}${Math.trunc(statementTimeoutMs)}`);
    const result = await client.query(sql, params);
    await client.query(SQL_COMMIT);
    return result;
  } catch (error) {
    // A failed rollback must not hide the statement's own error; the server discards the transaction on disconnect.
    await client.query(SQL_ROLLBACK).catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
