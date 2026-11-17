/**
 * Input of `PgMcpService.searchSchema`.
 */
export interface SearchSchemaInput {
  /** Id of a registered connection. */
  connectionId: string;
  /** Text to look for in table and column names, case-insensitive; must not be blank. */
  term: string;
  /** Restrict the search to one schema; every user schema is searched when omitted. */
  schema?: string;
}
