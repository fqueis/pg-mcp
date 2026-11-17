import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * Runs one catalog statement and returns its result. The service binds it to a
 * read-only transaction on a registered connection.
 *
 * @param sql - Catalog SQL text.
 * @param params - Values bound to the positional placeholders.
 */
export type CatalogRunner = (sql: string, params?: unknown[]) => Promise<QueryResult>;
