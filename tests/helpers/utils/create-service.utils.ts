import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { WritePolicyMode } from '@constants/write-policy.constants.js';
import { ConnectionRegistryService } from '@services/connection-registry.service.js';
import { PgMcpService } from '@services/pg-mcp.service.js';
import { WritePolicyService } from '@services/write-policy.service.js';

import {
  CLOCK_START_MS,
  HARNESS_MAX_ROWS,
  HARNESS_STATEMENT_TIMEOUT_MS,
  ONE_DAY_MS,
} from '@tests/helpers/constants/connection-fixtures.constants.js';
import { FakeElicitor } from '@tests/helpers/fakes/fake-elicitor.provider.js';
import { FakePool } from '@tests/helpers/fakes/fake-pool.provider.js';
import type { HarnessOverrides } from '@tests/helpers/interfaces/harness-overrides.interface.js';
import type { ServiceHarness } from '@tests/helpers/interfaces/service-harness.interface.js';
import type { FakeHandler } from '@tests/helpers/types/fake-handler.type.js';

/**
 * Builds a {@link PgMcpService} over a temporary registry file and fake pools.
 *
 * @param poolHandler - Optional script for the fake pools' answers.
 * @param overrides - Optional write policy mode and elicitor.
 * @returns The wired harness; call `cleanup()` when the test ends.
 */
export async function createServiceHarness(
  poolHandler?: FakeHandler,
  overrides: HarnessOverrides = {},
): Promise<ServiceHarness> {
  const dir = await mkdtemp(path.join(tmpdir(), 'pg-mcp-service-'));
  const clock = { now: CLOCK_START_MS };
  const env: NodeJS.ProcessEnv = {};
  const pools: ServiceHarness['pools'] = [];
  const registry = new ConnectionRegistryService({
    filePath: path.join(dir, 'connections.json'),
    ttlMs: ONE_DAY_MS,
    now: () => clock.now,
  });
  const service = new PgMcpService({
    registry,
    env,
    maxRows: HARNESS_MAX_ROWS,
    statementTimeoutMs: HARNESS_STATEMENT_TIMEOUT_MS,
    writePolicy: new WritePolicyService({
      mode: overrides.writeMode ?? WritePolicyMode.OFF,
      elicitor: overrides.elicitor ?? new FakeElicitor(false),
    }),
    createPool: (connectionString) => {
      const pool = new FakePool(poolHandler);
      pools.push({ connectionString, pool });
      return pool;
    },
  });

  return { service, registry, pools, clock, env, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
