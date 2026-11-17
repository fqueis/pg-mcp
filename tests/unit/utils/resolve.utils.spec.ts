import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionSourceKind } from '@constants/connection-source-kind.constants.js';
import { TEXT_FILE_ENCODING } from '@constants/encoding.constants.js';
import { resolveConnectionString } from '@utils/resolve.utils.js';

import { SHOP_ENV_KEY, SHOP_ENV_VAR, SHOP_URL } from '@tests/helpers/constants/connection-fixtures.constants.js';

/**
 * Seam: `resolveConnectionString` for the three credential sources: literal,
 * environment variable, and `.env` file.
 *
 * Out of scope: parsing the resolved URL.
 */
describe('resolveConnectionString', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'pg-mcp-resolve-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns a literal connection string unchanged', async () => {
    expect(await resolveConnectionString({ kind: ConnectionSourceKind.LITERAL, databaseUrl: SHOP_URL })).toBe(SHOP_URL);
  });

  it('reads the connection string from an environment variable', async () => {
    const env = { [SHOP_ENV_VAR]: SHOP_URL };

    expect(await resolveConnectionString({ kind: ConnectionSourceKind.ENV, envVar: SHOP_ENV_VAR }, env)).toBe(SHOP_URL);
  });

  it('names the variable, not its value, when the environment variable is missing', async () => {
    const attempt = resolveConnectionString({ kind: ConnectionSourceKind.ENV, envVar: SHOP_ENV_VAR }, {});

    await expect(attempt).rejects.toThrow(SHOP_ENV_VAR);
  });

  it('reads the connection string from a key of a .env file', async () => {
    const envFile = path.join(dir, '.env');
    await writeFile(envFile, `OTHER=1\n${SHOP_ENV_KEY}="${SHOP_URL}"\n`, TEXT_FILE_ENCODING);

    const source = { kind: ConnectionSourceKind.ENV_FILE, envFile, envKey: SHOP_ENV_KEY } as const;

    expect(await resolveConnectionString(source)).toBe(SHOP_URL);
  });

  it('fails clearly when the .env file has no such key', async () => {
    const envFile = path.join(dir, '.env');
    await writeFile(envFile, 'OTHER=1\n', TEXT_FILE_ENCODING);

    const attempt = resolveConnectionString({ kind: ConnectionSourceKind.ENV_FILE, envFile, envKey: SHOP_ENV_KEY });

    await expect(attempt).rejects.toThrow(SHOP_ENV_KEY);
  });

  it('fails clearly when the .env file does not exist', async () => {
    const envFile = path.join(dir, 'missing.env');

    const attempt = resolveConnectionString({ kind: ConnectionSourceKind.ENV_FILE, envFile, envKey: SHOP_ENV_KEY });

    await expect(attempt).rejects.toThrow(/missing\.env/);
  });
});
