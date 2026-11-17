/** Directory that holds the catalog query files in the source tree. */
export const SQL_SOURCE_DIRECTORY = new URL('../../src/sql/', import.meta.url);

/** Directory the query files are copied to, next to the compiled code. */
export const SQL_OUTPUT_DIRECTORY = new URL('../../dist/sql/', import.meta.url);
