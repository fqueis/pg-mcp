/**
 * Discriminator of {@link ConnectionSource}: where a connection string comes from.
 *
 * `literal` carries the URL itself. `env` names an environment variable of the
 * server process. `envFile` names a `.env` file and a key inside it.
 */
export const ConnectionSourceKind = {
  /** The connection string is stored in the registry as given. */
  LITERAL: 'literal',
  /** The connection string is read from an environment variable at connect time. */
  ENV: 'env',
  /** The connection string is read from a key of a `.env` file at connect time. */
  ENV_FILE: 'envFile',
} as const;

/**
 * Union of {@link ConnectionSourceKind} values.
 */
export type ConnectionSourceKindType = (typeof ConnectionSourceKind)[keyof typeof ConnectionSourceKind];
