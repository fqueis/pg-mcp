/**
 * Result of `PgMcpService.execute`.
 */
export interface ExecuteOutput {
  /** Rows the statement affected, or `null` when the command reports none. */
  rowCount: number | null;
  /** Rows returned by a `RETURNING` clause, at most the configured row limit. */
  rows: Record<string, unknown>[];
  /** `true` when a `RETURNING` clause produced more rows than the limit. */
  truncated: boolean;
}
