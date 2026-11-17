/** Port PostgreSQL listens on when a connection string omits one. */
export const DEFAULT_PG_PORT = 5432;

/** URL protocols accepted for a PostgreSQL connection string. */
export const POSTGRES_URL_PROTOCOLS: readonly string[] = ['postgres:', 'postgresql:'];

/** Separator between the parts of a derived connection id. */
export const CONNECTION_ID_SEPARATOR = '-';

/** Matches every run of characters that cannot appear in a connection id. */
export const CONNECTION_ID_INVALID_RUN_PATTERN = /[^a-z0-9]+/g;

/** Matches a separator at the start or end of a derived connection id. */
export const CONNECTION_ID_EDGE_SEPARATOR_PATTERN = /^-|-$/g;

/** Matches the leading slash of a URL path, which precedes the database name. */
export const URL_PATH_LEADING_SLASH_PATTERN = /^\//;
