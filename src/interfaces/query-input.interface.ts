/**
 * Input of `PgMcpService.query`.
 */
export interface QueryInput {
  /** Id of a registered connection. */
  connectionId: string;
  /** A single SQL statement; use `$1`, `$2`, and so on for values. */
  sql: string;
  /** Values bound to the positional placeholders. */
  params?: unknown[];
  /** Maximum rows to return; capped by the configured limit. */
  maxRows?: number;
}
