/**
 * An index as described to the agent.
 */
export interface IndexInfo {
  /** Index name. */
  name: string;
  /** Full `CREATE INDEX` statement that recreates the index. */
  definition: string;
}
