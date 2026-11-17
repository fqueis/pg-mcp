/**
 * A foreign key as described to the agent; composite keys list every column in order.
 */
export interface ForeignKeyInfo {
  /** Constraint name. */
  name: string;
  /** Columns of the described table. */
  columns: string[];
  /** Schema of the referenced table. */
  referencesSchema: string;
  /** Name of the referenced table. */
  referencesTable: string;
  /** Referenced columns, aligned with `columns`. */
  referencesColumns: string[];
}
