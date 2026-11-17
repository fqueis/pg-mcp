/**
 * Result of `PgMcpService.query`.
 */
export interface QueryOutput {
  /** Returned rows keyed by column name, at most the effective row limit. */
  rows: Record<string, unknown>[];
  /** Number of rows in `rows`. */
  rowCount: number;
  /** `true` when the statement produced more rows than the limit and the rest were dropped. */
  truncated: boolean;
}
