import type { ConnectionRegistryService } from '@services/connection-registry.service.js';
import type { PgMcpService } from '@services/pg-mcp.service.js';

import type { FakePool } from '@tests/helpers/fakes/fake-pool.provider.js';

/**
 * A real service wired to a real registry in a temporary directory and to fake
 * pools at the driver boundary.
 */
export interface ServiceHarness {
  /** Service under test. */
  service: PgMcpService;
  /** The registry the service persists to, for direct inspection. */
  registry: ConnectionRegistryService;
  /** Pools created by the service, in creation order, with the string each was opened with. */
  pools: { connectionString: string; pool: FakePool }[];
  /** Mutable clock shared with the registry. */
  clock: { now: number };
  /** Environment the service reads `env` sources from. */
  env: NodeJS.ProcessEnv;
  /** Removes the temporary directory. */
  cleanup: () => Promise<void>;
}
