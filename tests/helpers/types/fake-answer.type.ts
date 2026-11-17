import type { QueryResult } from '@interfaces/query-result.interface.js';

/**
 * Scripted answer for one statement: a result to return or an error to throw.
 */
export type FakeAnswer = QueryResult | Error;
