import type { ColumnMatch } from '@interfaces/column-match.interface.js';
import type { TableMatch } from '@interfaces/table-match.interface.js';

/**
 * Result of a schema search: the matching tables and the matching columns.
 */
export interface SchemaSearchResult {
  /** Tables and views whose name contains the term, capped per search. */
  tables: TableMatch[];
  /** Columns whose name contains the term, capped per search. */
  columns: ColumnMatch[];
}
