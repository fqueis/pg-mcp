/** Name the server announces to MCP clients. */
export const SERVER_NAME = 'pg-mcp';

/**
 * Path of `package.json` relative to the `utils` folder. It is the same from
 * `src/utils` and from the published `dist/utils`, so one path works in both.
 */
export const PACKAGE_JSON_RELATIVE_PATH = '../../package.json';

/** Process signals that close the open pools before the server exits. */
export const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

/** Prefix of the message written to stderr when the server cannot start. Stdout is reserved for MCP traffic. */
export const STARTUP_FAILURE_PREFIX = 'pg-mcp failed to start:';

/** Process exit code for a failed start. */
export const EXIT_CODE_FAILURE = 1;
