import { ConnectionSourceKind } from '@constants/connection-source-kind.constants.js';
import type { NewConnectionEntry } from '@app-types/new-connection-entry.type.js';

/** One day in milliseconds; the registry TTL used by tests. */
export const ONE_DAY_MS = 86_400_000;

/** Fixed instant, in epoch milliseconds, the test clocks start at, so expiry never depends on the wall clock. */
export const CLOCK_START_MS = 1_000_000;

/** Literal connection string of the `shop` database, password included. */
export const SHOP_URL = 'postgres://app:s3cret@localhost:5432/shop';

/** Environment variable that holds {@link SHOP_URL} in env-source tests. */
export const SHOP_ENV_VAR = 'SHOP_DATABASE_URL';

/** Key that holds {@link SHOP_URL} inside `.env` files in env-file tests. */
export const SHOP_ENV_KEY = 'DATABASE_URL';

/** Registry entry for the `shop` database, backed by an environment variable. */
export const SHOP_ENTRY: NewConnectionEntry = {
  id: 'shop',
  source: { kind: ConnectionSourceKind.ENV, envVar: SHOP_ENV_VAR },
  host: 'localhost',
  port: 5432,
  database: 'shop',
  user: 'app',
};

/** Row limit the service harness is configured with. */
export const HARNESS_MAX_ROWS = 3;

/** Statement timeout, in milliseconds, the service harness is configured with. */
export const HARNESS_STATEMENT_TIMEOUT_MS = 15_000;
