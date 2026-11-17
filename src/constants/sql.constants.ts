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

/**
 * Prefix of the statement that turns a query into a server-side cursor; the query follows it.
 * Reading through a cursor lets the server hand over only the rows asked for.
 */
export const SQL_DECLARE_CURSOR_PREFIX = 'DECLARE pg_mcp_cursor NO SCROLL CURSOR FOR ';

/**
 * Matches a statement that can be read through a cursor: it starts, after any white space and SQL comments,
 * with `SELECT`, `WITH`, `VALUES`, `TABLE`, or an opening parenthesis. A statement that does not (`SHOW`,
 * `EXPLAIN`, a write, invalid SQL) is run directly, so a cursor the server would refuse is not even tried and
 * leaves no error in its log. A match is only a hint: a data-modifying `WITH` still matches and falls back.
 *
 * Each alternative inside the leading group starts with a different character, so matching stays linear.
 */
export const SQL_CURSOR_CANDIDATE_PATTERN =
  /^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*(?:\(|(?:select|with|values|table)\b)/i;

/** Prefix of the statement that reads rows from the cursor; the row count and {@link SQL_FETCH_CURSOR_SUFFIX} follow it. */
export const SQL_FETCH_FORWARD_PREFIX = 'FETCH FORWARD ';

/** Suffix of the statement that reads rows from the cursor, after the row count. */
export const SQL_FETCH_CURSOR_SUFFIX = ' FROM pg_mcp_cursor';

/** Prefix of the statement that caps how long one statement may run; the milliseconds follow it. */
export const SQL_SET_STATEMENT_TIMEOUT_PREFIX = 'SET LOCAL statement_timeout = ';
