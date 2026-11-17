/** Statement that reports the server version; doubles as the connectivity check. */
export const SQL_SHOW_SERVER_VERSION = 'SHOW server_version';

/** Column returned by {@link SQL_SHOW_SERVER_VERSION}. */
export const SQL_COLUMN_SERVER_VERSION = 'server_version';

/** Opens a transaction the server refuses to write in, whatever the SQL says. */
export const SQL_BEGIN_READ_ONLY = 'BEGIN READ ONLY';

/** Opens a regular read-write transaction. */
export const SQL_BEGIN = 'BEGIN';

/** Ends a transaction keeping its changes. */
export const SQL_COMMIT = 'COMMIT';

/** Ends a transaction discarding its changes. */
export const SQL_ROLLBACK = 'ROLLBACK';

/** Prefix of the statement that caps how long one statement may run; the milliseconds follow it. */
export const SQL_SET_STATEMENT_TIMEOUT_PREFIX = 'SET LOCAL statement_timeout = ';
