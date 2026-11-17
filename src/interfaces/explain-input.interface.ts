/**
 * Input of `PgMcpService.explain`.
 */
export interface ExplainInput {
  /** Id of a registered connection. */
  connectionId: string;
  /** A single SQL statement to explain; use `$1`, `$2`, and so on for values. */
  sql: string;
  /** Values bound to the positional placeholders. */
  params?: unknown[];
  /** When `true` the statement really runs and the plan carries measured times; the transaction stays read-only. */
  analyze?: boolean;
}
