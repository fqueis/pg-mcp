/**
 * Result of `PgMcpService.explain`.
 */
export interface ExplainOutput {
  /** The execution plan as PostgreSQL reports it in JSON format: a `Plan` tree plus planning and execution times when analyzed. */
  plan: Record<string, unknown>;
}
