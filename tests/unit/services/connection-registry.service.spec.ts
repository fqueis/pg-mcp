import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionRegistryService } from '@services/connection-registry.service.js';

import { CLOCK_START_MS, ONE_DAY_MS, SHOP_ENTRY } from '@tests/helpers/constants/connection-fixtures.constants.js';

/**
 * Seam: `ConnectionRegistryService`, the on-disk store of registered connections,
 * over a real temporary file and an injected clock.
 *
 * Out of scope: opening database connections and resolving credentials.
 */
describe('ConnectionRegistryService', () => {
  let dir: string;
  let filePath: string;
  let clock: { now: number };

  /**
   * Opens a registry on the test file with the shared mutable clock.
   *
   * @param ttlMs - Sliding TTL; defaults to one day.
   * @returns A new registry instance, so several sessions can share one file.
   */
  const open = (ttlMs = ONE_DAY_MS) => new ConnectionRegistryService({ filePath, ttlMs, now: () => clock.now });

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'pg-mcp-registry-'));
    filePath = path.join(dir, 'connections.json');
    clock = { now: CLOCK_START_MS };
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('keeps a registered connection across registry instances', async () => {
    await open().use(SHOP_ENTRY);

    expect(await open().get('shop')).toEqual({ ...SHOP_ENTRY, lastUsedAt: CLOCK_START_MS });
  });

  it('drops a connection once its TTL has elapsed', async () => {
    const registry = open(ONE_DAY_MS);
    await registry.use(SHOP_ENTRY);

    clock.now += ONE_DAY_MS + 1;

    expect(await registry.get('shop')).toBeUndefined();
  });

  it('renews the TTL when the same id is registered again', async () => {
    const registry = open(ONE_DAY_MS);
    await registry.use(SHOP_ENTRY);

    clock.now += ONE_DAY_MS - 1;
    await registry.use(SHOP_ENTRY);
    clock.now += ONE_DAY_MS - 1;

    expect(await registry.get('shop')).toMatchObject({ id: 'shop', lastUsedAt: CLOCK_START_MS + ONE_DAY_MS - 1 });
  });

  it('lists live connections sorted by id', async () => {
    const registry = open(ONE_DAY_MS);
    await registry.use({ ...SHOP_ENTRY, id: 'zeta' });
    await registry.use({ ...SHOP_ENTRY, id: 'alpha' });

    expect((await registry.list()).map((c) => c.id)).toEqual(['alpha', 'zeta']);
  });

  it('forgets one connection and reports whether it existed', async () => {
    const registry = open();
    await registry.use(SHOP_ENTRY);

    expect(await registry.forget('shop')).toBe(true);
    expect(await registry.forget('shop')).toBe(false);
    expect(await registry.get('shop')).toBeUndefined();
  });

  it('clears every connection and returns how many were removed', async () => {
    const registry = open();
    await registry.use(SHOP_ENTRY);
    await registry.use({ ...SHOP_ENTRY, id: 'other' });

    expect(await registry.clear()).toBe(2);
    expect(await registry.list()).toEqual([]);
  });

  it('treats a corrupt registry file as empty', async () => {
    await writeFile(filePath, '{ not json', 'utf8');

    expect(await open().list()).toEqual([]);
  });

  it('keeps connections registered by two sessions sharing one file', async () => {
    const sessionA = open();
    const sessionB = open();

    await sessionA.use({ ...SHOP_ENTRY, id: 'from-a' });
    await sessionB.use({ ...SHOP_ENTRY, id: 'from-b' });

    expect((await sessionA.list()).map((c) => c.id)).toEqual(['from-a', 'from-b']);
  });

  it.skipIf(process.platform === 'win32')('restricts the registry file to its owner', async () => {
    await open().use(SHOP_ENTRY);

    expect((await stat(filePath)).mode & 0o777).toBe(0o600);
  });

  it('renews the TTL when a connection is touched', async () => {
    const registry = open(ONE_DAY_MS);
    await registry.use(SHOP_ENTRY);

    clock.now += ONE_DAY_MS - 1;
    await registry.touch('shop');
    clock.now += ONE_DAY_MS - 1;

    expect(await registry.get('shop')).toBeDefined();
  });
});
