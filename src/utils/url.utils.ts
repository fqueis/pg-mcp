import {
  CONNECTION_ID_EDGE_SEPARATOR_PATTERN,
  CONNECTION_ID_INVALID_RUN_PATTERN,
  CONNECTION_ID_SEPARATOR,
  DEFAULT_PG_PORT,
  POSTGRES_URL_PROTOCOLS,
  URL_PATH_LEADING_SLASH_PATTERN,
} from '@constants/connection-url.constants.js';
import { ErrorMessage } from '@constants/error-messages.constants.js';
import type { ConnectionTarget } from '@interfaces/connection-target.interface.js';

/**
 * Extracts the non-secret target from a PostgreSQL connection string.
 *
 * The error message never echoes the input, because the input carries a password.
 *
 * @param connectionString - A `postgres://` or `postgresql://` URL.
 * @returns Host, port, database, and user.
 * @throws {@link Error} when the string is not a parseable PostgreSQL URL.
 * @example
 * ```typescript
 * parseConnectionString('postgres://app:pw@db:5433/shop');
 * // { host: 'db', port: 5433, database: 'shop', user: 'app' }
 * ```
 */
export function parseConnectionString(connectionString: string): ConnectionTarget {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(ErrorMessage.INVALID_CONNECTION_STRING);
  }
  if (!POSTGRES_URL_PROTOCOLS.includes(url.protocol)) throw new Error(ErrorMessage.INVALID_CONNECTION_STRING);

  return {
    host: decodeURIComponent(url.hostname),
    port: url.port ? Number(url.port) : DEFAULT_PG_PORT,
    database: decodeURIComponent(url.pathname.replace(URL_PATH_LEADING_SLASH_PATTERN, '')),
    user: decodeURIComponent(url.username),
  };
}

/**
 * Builds the default connection id, `host-port-database`, lowercased with every
 * run of characters outside `a-z0-9` collapsed to a single hyphen.
 *
 * @param target - Connection target.
 * @returns A stable, URL-safe id.
 * @example
 * ```typescript
 * deriveConnectionId({ host: 'localhost', port: 5432, database: 'Shop_DB', user: 'app' }); // 'localhost-5432-shop-db'
 * ```
 */
export function deriveConnectionId(target: ConnectionTarget): string {
  return [target.host, target.port, target.database]
    .join(CONNECTION_ID_SEPARATOR)
    .toLowerCase()
    .replace(CONNECTION_ID_INVALID_RUN_PATTERN, CONNECTION_ID_SEPARATOR)
    .replace(CONNECTION_ID_EDGE_SEPARATOR_PATTERN, '');
}
