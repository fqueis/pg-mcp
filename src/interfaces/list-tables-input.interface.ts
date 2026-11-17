/**
 * Input of `PgMcpService.listTables`.
 */
export interface ListTablesInput {
  /** Id of a registered connection. */
  connectionId: string;
  /** Schema to list; defaults to `public`. */
  schema?: string;
}
