/**
 * Input of `PgMcpService.describeTable`.
 */
export interface DescribeTableInput {
  /** Id of a registered connection. */
  connectionId: string;
  /** Table or view name. */
  table: string;
  /** Schema of the table; defaults to `public`. */
  schema?: string;
}
