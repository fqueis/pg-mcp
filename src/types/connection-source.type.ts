import type { ConnectionSourceKind } from '@constants/connection-source-kind.constants.js';

/**
 * Where a connection string comes from.
 *
 * Reference sources keep the secret out of the registry file: only the
 * variable name, or the file path and key, are stored.
 *
 * @see ConnectionSourceKind - Discriminator values
 */
export type ConnectionSource =
  | { kind: typeof ConnectionSourceKind.LITERAL; databaseUrl: string }
  | { kind: typeof ConnectionSourceKind.ENV; envVar: string }
  | { kind: typeof ConnectionSourceKind.ENV_FILE; envFile: string; envKey: string };
