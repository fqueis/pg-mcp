/**
 * Input of `PgMcpService.execute`.
 */
export interface ExecuteInput {
  /** Id of a registered connection. */
  connectionId: string;
  /** A single SQL statement that changes data; use `$1`, `$2`, and so on for values. */
  sql: string;
  /** Values bound to the positional placeholders. */
  params?: unknown[];
  /** Set to `true` only after the human explicitly approved this exact statement in chat. Used when the client cannot ask. */
  confirmedByUser?: boolean;
}
