/**
 * A column as described to the agent.
 */
export interface ColumnInfo {
  /** Column name. */
  name: string;
  /** Catalog data type name. */
  type: string;
  /** Whether the column accepts `NULL`. */
  nullable: boolean;
  /** Default expression, or `null` when the column has none. */
  default: string | null;
}
