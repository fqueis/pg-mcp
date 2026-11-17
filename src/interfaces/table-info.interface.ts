/**
 * A table or view as listed to the agent.
 */
export interface TableInfo {
  /** Table or view name. */
  name: string;
  /** Catalog type, such as `BASE TABLE` or `VIEW`. */
  type: string;
}
