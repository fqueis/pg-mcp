import type { ColumnInfo } from '@interfaces/column-info.interface.js';
import type { ForeignKeyInfo } from '@interfaces/foreign-key-info.interface.js';
import type { IndexInfo } from '@interfaces/index-info.interface.js';

/**
 * Structure of one table as described to the agent.
 */
export interface TableDescription {
  /** Schema the table belongs to. */
  schema: string;
  /** Table name. */
  table: string;
  /** Columns in declaration order. */
  columns: ColumnInfo[];
  /** Primary key columns in key order; empty when the table has none. */
  primaryKey: string[];
  /** Foreign keys, grouped by constraint. */
  foreignKeys: ForeignKeyInfo[];
  /** Indexes in alphabetical order. */
  indexes: IndexInfo[];
}
