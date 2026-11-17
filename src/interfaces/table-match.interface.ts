/**
 * A table or view whose name matched a schema search.
 */
export interface TableMatch {
  /** Schema the table belongs to. */
  schema: string;
  /** Table or view name. */
  name: string;
  /** Kind of relation: `table`, `view`, `materialized view`, or `foreign table`. */
  type: string;
}
