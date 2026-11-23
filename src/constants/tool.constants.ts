import { ToolAnnotation } from '@constants/tool-annotation.constants.js';

/**
 * Name, title, behavior hints, and description of every MCP tool. The description is what the
 * agent reads to decide when to call the tool.
 */
export const ToolMetadata = {
  /** Registers or renews a connection. */
  USE_CONNECTION: {
    name: 'use_connection',
    title: 'Use connection',
    annotations: ToolAnnotation.REGISTER,
    description:
      'Register or renew a PostgreSQL connection and verify it. Give exactly one credential source: ' +
      'databaseUrl (stored as given), envVar (name of an environment variable of the server process), or envFile ' +
      'with envKey (a .env file and the key inside it). Prefer envVar or envFile so the password never appears in ' +
      'the conversation. Call this before any other tool when no connection is registered for the project.',
  },
  /** Lists registered connections. */
  LIST_CONNECTIONS: {
    name: 'list_connections',
    title: 'List connections',
    annotations: ToolAnnotation.READ,
    description: 'List the registered connections that have not expired. Never returns a password.',
  },
  /** Removes one connection. */
  FORGET_CONNECTION: {
    name: 'forget_connection',
    title: 'Forget connection',
    annotations: ToolAnnotation.REMOVE,
    description: 'Remove one connection from the registry and close its pool.',
  },
  /** Removes every connection. */
  CLEAR_CONNECTIONS: {
    name: 'clear_connections',
    title: 'Clear connections',
    annotations: ToolAnnotation.REMOVE,
    description: 'Remove every connection from the registry and close every pool.',
  },
  /** Reopens a connection. */
  REFRESH_CONNECTION: {
    name: 'refresh_connection',
    title: 'Refresh connection',
    annotations: ToolAnnotation.REGISTER,
    description:
      'Reopen a registered connection and resolve its credential source again. Use it after the password or ' +
      'the .env file changed, or after the connection dropped.',
  },
  /** Lists schemas. */
  LIST_SCHEMAS: {
    name: 'list_schemas',
    title: 'List schemas',
    annotations: ToolAnnotation.READ,
    description: 'List the user schemas of the database behind a registered connection.',
  },
  /** Lists tables. */
  LIST_TABLES: {
    name: 'list_tables',
    title: 'List tables',
    annotations: ToolAnnotation.READ,
    description: 'List the tables and views of one schema (default public) of a registered connection.',
  },
  /** Describes a table. */
  DESCRIBE_TABLE: {
    name: 'describe_table',
    title: 'Describe table',
    annotations: ToolAnnotation.READ,
    description:
      'Describe one table or view: columns with types, nullability and defaults, primary key, foreign keys, and indexes.',
  },
  /** Searches tables and columns by name. */
  SEARCH_SCHEMA: {
    name: 'search_schema',
    title: 'Search schema',
    annotations: ToolAnnotation.READ,
    description:
      'Find tables and columns whose name contains a term (case-insensitive), across every user schema or one schema. ' +
      'Use it in an unfamiliar database to locate where something lives before calling describe_table. ' +
      'Results are capped per kind.',
  },
  /** Runs a read-only query. */
  QUERY: {
    name: 'query',
    title: 'Run a read-only query',
    annotations: ToolAnnotation.READ,
    description:
      'Run one SQL statement inside a read-only transaction. The server refuses any write. Results are capped ' +
      'at the row limit and flagged with truncated when more rows existed. Bind values with $1, $2 and params.',
  },
  /** Explains a statement. */
  EXPLAIN: {
    name: 'explain',
    title: 'Explain a statement',
    annotations: ToolAnnotation.READ,
    description:
      'Return the execution plan of one SQL statement as JSON, to judge cost and index use before running it. ' +
      'Without analyze the statement is only planned, so even an INSERT, UPDATE or DELETE can be explained safely. ' +
      'With analyze the statement really runs and the plan carries measured times; the transaction stays read-only, ' +
      'so a write is still refused.',
  },
  /** Runs a statement that changes data. */
  EXECUTE: {
    name: 'execute',
    title: 'Run a statement that changes data',
    annotations: ToolAnnotation.WRITE,
    description:
      'Run one INSERT, UPDATE, DELETE, or DDL statement in a transaction. Depending on the server settings this is ' +
      'refused, needs the human to approve it, or runs directly. When the client cannot ask the human, show the ' +
      'human the connection and the exact SQL, get an explicit yes in chat, and only then set confirmedByUser to true.',
  },
} as const;

/**
 * Descriptions of the tool input fields, shown to the agent in the tool schema.
 */
export const ToolField = {
  /** `connectionId` of every tool that targets a registered connection. */
  CONNECTION_ID: 'Id of a registered connection; see list_connections.',
  /** `databaseUrl` of use_connection. */
  DATABASE_URL: 'Literal connection string, postgres://user:password@host:port/database. It is stored in the registry.',
  /** `envVar` of use_connection. */
  ENV_VAR: 'Name of an environment variable of the server process that holds the connection string.',
  /** `envFile` of use_connection. */
  ENV_FILE: 'Absolute path of a .env file that holds the connection string. Requires envKey.',
  /** `envKey` of use_connection. */
  ENV_KEY: 'Key inside envFile that holds the connection string, for example DATABASE_URL.',
  /** `id` of use_connection. */
  CONNECTION_NEW_ID: 'Stable id to register under. Defaults to host-port-database.',
  /** `schema` of list_tables and describe_table. */
  SCHEMA: 'Schema name. Defaults to public.',
  /** `term` of search_schema. */
  SEARCH_TERM: 'Text to look for in table and column names, case-insensitive. Not blank.',
  /** `table` of describe_table. */
  TABLE: 'Table or view name.',
  /** `sql` of query. */
  QUERY_SQL: 'A single read-only SQL statement. Use $1, $2 for values.',
  /** `sql` of execute. */
  EXECUTE_SQL: 'A single SQL statement that changes data. Use $1, $2 for values.',
  /** `sql` of explain. */
  EXPLAIN_SQL: 'A single SQL statement to explain. Use $1, $2 for values.',
  /** `analyze` of explain. */
  ANALYZE: 'When true the statement really runs and the plan includes measured times. Default false: plan only.',
  /** `params` of query, explain and execute. */
  PARAMS: 'Values bound to $1, $2, and so on, in order.',
  /** `maxRows` of query. */
  MAX_ROWS: 'Maximum rows to return. Capped by the server limit.',
  /** `confirmedByUser` of execute. */
  CONFIRMED_BY_USER:
    'Set to true only after the human explicitly approved this exact statement in chat, when the client cannot ask them itself.',
} as const;
