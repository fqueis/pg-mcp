/**
 * Names of the catalog queries. Each one is a file `<name>.sql` in the `sql`
 * directory that ships with the package.
 */
export const CatalogQuery = {
  /** Lists the user schemas of the database. */
  LIST_SCHEMAS: 'list-schemas',
  /** Lists the tables and views of one schema. */
  LIST_TABLES: 'list-tables',
  /** Describes one table: columns, primary key, foreign keys, and indexes. */
  DESCRIBE_TABLE: 'describe-table',
  /** Finds tables and columns whose name contains a term. */
  SEARCH_SCHEMA: 'search-schema',
} as const;

/**
 * Union of {@link CatalogQuery} values.
 */
export type CatalogQueryType = (typeof CatalogQuery)[keyof typeof CatalogQuery];

/** Column every catalog query returns its JSON document in. */
export const CATALOG_RESULT_COLUMN = 'result';

/** File extension of a catalog query file. */
export const CATALOG_SQL_EXTENSION = '.sql';

/**
 * Directory that holds the catalog query files. Resolved from this module, so it
 * is `src/sql/` when running from source and `dist/sql/` from the published package.
 */
export const CATALOG_SQL_DIRECTORY = new URL('../sql/', import.meta.url);

/** Maximum matches a schema search returns for tables, and again for columns. */
export const SEARCH_RESULT_LIMIT = 50;

/** Schema assumed when the caller does not name one. */
export const DEFAULT_SCHEMA = 'public';
