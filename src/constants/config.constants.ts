/**
 * Names of the environment variables that configure the server. MCP clients
 * pass them to the process as strings.
 */
export const EnvVar = {
  /** Path of the registry file. */
  REGISTRY_PATH: 'PG_MCP_REGISTRY_PATH',
  /** Sliding time-to-live of a registered connection, in milliseconds. */
  REGISTRY_TTL_MS: 'PG_MCP_REGISTRY_TTL_MS',
  /** Write policy mode: `off`, `ask`, or `on`. */
  WRITES: 'PG_MCP_WRITES',
  /** Shortcut that turns writes on without asking; ignored when `PG_MCP_WRITES` is set. */
  ENABLE_WRITES: 'PG_MCP_ENABLE_WRITES',
  /** Upper bound of rows a query returns. */
  MAX_ROWS: 'PG_MCP_MAX_ROWS',
  /** Milliseconds after which the server cancels a running statement. */
  STATEMENT_TIMEOUT_MS: 'PG_MCP_STATEMENT_TIMEOUT_MS',
} as const;

/** Name of the folder, inside the home directory, that holds the registry file. */
export const REGISTRY_DIRECTORY_NAME = '.pg-mcp';

/** Name of the registry file. */
export const REGISTRY_FILE_NAME = 'connections.json';

/** Default time-to-live of a registered connection: seven days. */
export const DEFAULT_REGISTRY_TTL_MS = 604_800_000;

/** Default upper bound of rows a query returns. */
export const DEFAULT_MAX_ROWS = 500;

/** Default milliseconds after which the server cancels a running statement. */
export const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000;

/** Values, compared in lower case, that turn a flag environment variable on. */
export const TRUTHY_ENV_VALUES: readonly string[] = ['1', 'true', 'yes'];

/** Matches a string made only of digits, the only form accepted for a numeric setting. */
export const POSITIVE_INTEGER_PATTERN = /^\d+$/;
