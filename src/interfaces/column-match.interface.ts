/**
 * A column whose name matched a schema search.
 */
export interface ColumnMatch {
  /** Schema of the table that owns the column. */
  schema: string;
  /** Table or view that owns the column. */
  table: string;
  /** Column name. */
  column: string;
  /** Catalog data type name. */
  type: string;
}
