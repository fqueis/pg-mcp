import { readFile } from 'node:fs/promises';

import { CATALOG_RESULT_COLUMN, CATALOG_SQL_DIRECTORY, CATALOG_SQL_EXTENSION } from '@constants/catalog.constants.js';
import type { CatalogQueryType } from '@constants/catalog.constants.js';
import { TEXT_FILE_ENCODING } from '@constants/encoding.constants.js';
import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * Reads the text of a catalog query straight from its `.sql` file, so a fake
 * pool can recognise the statement the service sends.
 *
 * @param query - Catalog query name.
 * @returns The file content, exactly as the service sends it.
 */
export function readCatalogSql(query: CatalogQueryType): Promise<string> {
  return readFile(new URL(`${query}${CATALOG_SQL_EXTENSION}`, CATALOG_SQL_DIRECTORY), TEXT_FILE_ENCODING);
}

/**
 * Builds the single-row answer a catalog query returns: one JSON document in
 * the result column.
 *
 * @param result - The JSON document the query would produce.
 * @returns A query result holding that document.
 */
export function catalogAnswer(result: unknown): QueryResult {
  return { rows: [{ [CATALOG_RESULT_COLUMN]: result }], rowCount: 1 };
}
