import { readFile } from 'node:fs/promises';

import {
  CATALOG_RESULT_COLUMN,
  CATALOG_SQL_DIRECTORY,
  CATALOG_SQL_EXTENSION,
  CatalogQuery,
  DEFAULT_SCHEMA,
} from '@constants/catalog.constants.js';
import type { CatalogQueryType } from '@constants/catalog.constants.js';
import { TEXT_FILE_ENCODING } from '@constants/encoding.constants.js';
import { ErrorMessage } from '@constants/error-messages.constants.js';
import type { TableDescription } from '@interfaces/table-description.interface.js';
import type { TableInfo } from '@interfaces/table-info.interface.js';
import type { CatalogRunner } from '@app-types/catalog-runner.type.js';

/**
 * Reads database structure through the catalog query files in `src/sql`.
 *
 * Each query returns one JSON document already shaped like the result type, so
 * this class only loads the SQL, runs it, and unwraps the document. It does not
 * open connections or transactions: the caller supplies a {@link CatalogRunner}.
 */
export class CatalogService {
  /** Query text already read from disk, so each file is read once per process. */
  private readonly sqlCache = new Map<CatalogQueryType, string>();

  /**
   * Lists the user schemas of a database.
   *
   * @param run - Runs a catalog statement.
   * @returns Schema names in alphabetical order.
   */
  async listSchemas(run: CatalogRunner): Promise<string[]> {
    return (await this.fetch<string[]>(run, CatalogQuery.LIST_SCHEMAS)) ?? [];
  }

  /**
   * Lists the tables and views of one schema.
   *
   * @param run - Runs a catalog statement.
   * @param schema - Schema to list; defaults to `public`.
   * @returns Tables and views in alphabetical order.
   */
  async listTables(run: CatalogRunner, schema: string = DEFAULT_SCHEMA): Promise<TableInfo[]> {
    return (await this.fetch<TableInfo[]>(run, CatalogQuery.LIST_TABLES, [schema])) ?? [];
  }

  /**
   * Describes one table: columns, primary key, foreign keys, and indexes.
   *
   * @param run - Runs a catalog statement.
   * @param table - Table or view name.
   * @param schema - Schema of the table; defaults to `public`.
   * @returns The table structure.
   * @throws {@link Error} when the table does not exist.
   */
  async describeTable(run: CatalogRunner, table: string, schema: string = DEFAULT_SCHEMA): Promise<TableDescription> {
    const description = await this.fetch<TableDescription>(run, CatalogQuery.DESCRIBE_TABLE, [schema, table]);
    if (!description) throw new Error(ErrorMessage.tableNotFound(schema, table));
    return description;
  }

  /**
   * Runs one catalog query and unwraps the JSON document it returns.
   *
   * @param run - Runs a catalog statement.
   * @param query - Which catalog query file to run.
   * @param params - Values bound to the query placeholders.
   * @returns The document in the result column, or `undefined` when the query returned no row.
   */
  private async fetch<T>(run: CatalogRunner, query: CatalogQueryType, params?: unknown[]): Promise<T | undefined> {
    const result = await run(await this.sql(query), params);
    return result.rows[0]?.[CATALOG_RESULT_COLUMN] as T | undefined;
  }

  /**
   * Loads the text of a catalog query file and caches it after the first read.
   *
   * @param query - Which catalog query file to load.
   * @returns The SQL text.
   */
  private async sql(query: CatalogQueryType): Promise<string> {
    const cached = this.sqlCache.get(query);
    if (cached !== undefined) return cached;

    const text = await readFile(new URL(`${query}${CATALOG_SQL_EXTENSION}`, CATALOG_SQL_DIRECTORY), TEXT_FILE_ENCODING);
    this.sqlCache.set(query, text);
    return text;
  }
}
