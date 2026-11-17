/**
 * Minimal result of a database query, the subset of the driver result the
 * service reads. The `pg` driver result satisfies it structurally.
 */
export interface QueryResult {
  /** Returned rows keyed by column name. */
  rows: Record<string, unknown>[];
  /** Rows affected or returned; `null` when the command reports none. */
  rowCount: number | null;
}
