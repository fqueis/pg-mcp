/**
 * Non-secret description of the database a connection points at. Safe to show
 * to the agent and to the user.
 */
export interface ConnectionTarget {
  /** Server host name or address. */
  host: string;
  /** Server TCP port. */
  port: number;
  /** Database name. */
  database: string;
  /** Role the connection authenticates as. */
  user: string;
}
