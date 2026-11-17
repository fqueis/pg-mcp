/**
 * User-facing error messages. None of them may contain a credential value:
 * they name variables, keys, and files only.
 */
export const ErrorMessage = {
  /** The connection string is not a parseable PostgreSQL URL. It never echoes the input. */
  INVALID_CONNECTION_STRING: 'Invalid connection string. Expected postgres://user:password@host:port/database.',
  /** `use_connection` was called without any credential source. */
  NO_CREDENTIAL_SOURCE: 'Provide a credential source: databaseUrl, envVar, or envFile with envKey.',
  /** `use_connection` was called with more than one credential source. */
  MULTIPLE_CREDENTIAL_SOURCES: 'Provide exactly one credential source: databaseUrl, envVar, or envFile.',
  /** A write was attempted while the server runs with writes turned off. */
  WRITES_DISABLED: 'Writes are disabled on this server. Only read-only queries are allowed.',
  /** The human declined or cancelled the confirmation of a write. */
  WRITE_NOT_APPROVED: 'The change was not approved by the human, so it was not run.',
  /** The client cannot ask the human, so the agent must ask in chat and repeat the call with the confirmation flag. */
  WRITE_NEEDS_CONFIRMATION:
    "This change needs the human's approval. Show the human the connection and the exact SQL, ask for an explicit yes in chat, and only then repeat the call with confirmedByUser: true.",
  /** `search_schema` was called with an empty or whitespace-only term. */
  EMPTY_SEARCH_TERM: 'The search term must not be blank.',
  /** An `EXPLAIN` returned no plan row. */
  EXPLAIN_RETURNED_NO_PLAN: 'The database returned no plan for this statement.',
  /** `envFile` was given without the key to read from it. */
  ENV_FILE_REQUIRES_KEY: 'envFile requires envKey, the name of the key that holds the connection string.',

  /**
   * No connection is registered under the id.
   *
   * @param id - The id the caller used.
   * @returns The message, pointing at how to register or list connections.
   */
  connectionNotFound: (id: string): string =>
    `No connection registered with id "${id}". Call use_connection first, or list_connections to see the registered ids.`,

  /**
   * The catalog has no table with that name.
   *
   * @param schema - Schema that was searched.
   * @param table - Table name that was not found.
   * @returns The message with the qualified name.
   */
  tableNotFound: (schema: string, table: string): string => `Table ${schema}.${table} was not found.`,

  /**
   * An environment variable named by an `env` source is missing or empty.
   *
   * @param envVar - Variable name; its value is never included.
   * @returns The message.
   */
  envVarNotSet: (envVar: string): string => `Environment variable ${envVar} is not set or is empty.`,

  /**
   * The `.env` file of an `envFile` source cannot be read.
   *
   * @param envFile - Path of the file.
   * @returns The message.
   */
  envFileUnreadable: (envFile: string): string => `Cannot read env file ${envFile}.`,

  /**
   * The key of an `envFile` source is missing or empty in the file.
   *
   * @param envKey - Key name; its value is never included.
   * @param envFile - Path of the file.
   * @returns The message.
   */
  envKeyNotSet: (envKey: string, envFile: string): string => `Key ${envKey} is not set in env file ${envFile}.`,
} as const;
