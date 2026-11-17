/**
 * Input of `PgMcpService.useConnection`. Exactly one credential source must be
 * given: `databaseUrl`, `envVar`, or `envFile` together with `envKey`.
 */
export interface UseConnectionInput {
  /** Literal connection string. It is stored in the registry file. */
  databaseUrl?: string;
  /** Name of an environment variable of the MCP server process holding the connection string. */
  envVar?: string;
  /** Path of a `.env` file holding the connection string. Requires `envKey`. */
  envFile?: string;
  /** Key inside `envFile` that holds the connection string. */
  envKey?: string;
  /** Stable id to register under. Defaults to `host-port-database`. */
  id?: string;
}
