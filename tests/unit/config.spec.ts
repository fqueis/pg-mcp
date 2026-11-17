import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadConfig } from '@/config.js';
import { WritePolicyMode } from '@constants/write-policy.constants.js';
import { EnvVar } from '@constants/config.constants.js';

/**
 * Seam: `loadConfig` turns the process environment into the server settings.
 *
 * Out of scope: reading the real `process.env` and the real home directory.
 */
describe('loadConfig', () => {
  /** Fake home directory, built with `path` so the expectations hold on every operating system. */
  const homeDir = path.join(path.sep, 'home', 'dev');

  it('uses safe defaults when nothing is configured', () => {
    expect(loadConfig({}, homeDir)).toEqual({
      registryPath: path.join(homeDir, '.pg-mcp', 'connections.json'),
      registryTtlMs: 604_800_000,
      writeMode: WritePolicyMode.ASK,
      maxRows: 500,
      statementTimeoutMs: 15_000,
    });
  });

  it('reads every setting from the environment', () => {
    const env = {
      [EnvVar.REGISTRY_PATH]: path.join(path.sep, 'data', 'registry.json'),
      [EnvVar.REGISTRY_TTL_MS]: '3600000',
      [EnvVar.WRITES]: 'off',
      [EnvVar.MAX_ROWS]: '25',
      [EnvVar.STATEMENT_TIMEOUT_MS]: '2000',
    };

    expect(loadConfig(env, homeDir)).toEqual({
      registryPath: path.join(path.sep, 'data', 'registry.json'),
      registryTtlMs: 3_600_000,
      writeMode: WritePolicyMode.OFF,
      maxRows: 25,
      statementTimeoutMs: 2000,
    });
  });

  it.each(['1', 'true', 'yes', 'TRUE'])('turns writes on without asking for the enable flag %s', (value) => {
    expect(loadConfig({ [EnvVar.ENABLE_WRITES]: value }, homeDir).writeMode).toBe(WritePolicyMode.ON);
  });

  it('lets the explicit write mode win over the enable flag', () => {
    const env = { [EnvVar.ENABLE_WRITES]: '1', [EnvVar.WRITES]: 'off' };

    expect(loadConfig(env, homeDir).writeMode).toBe(WritePolicyMode.OFF);
  });

  it('falls back to asking when the write mode is not recognised', () => {
    expect(loadConfig({ [EnvVar.WRITES]: 'whenever' }, homeDir).writeMode).toBe(WritePolicyMode.ASK);
  });

  it.each(['0', '-5', 'abc', '', '1.5'])('ignores %j as a number and keeps the default', (value) => {
    const config = loadConfig({ [EnvVar.MAX_ROWS]: value, [EnvVar.STATEMENT_TIMEOUT_MS]: value }, homeDir);

    expect(config.maxRows).toBe(500);
    expect(config.statementTimeoutMs).toBe(15_000);
  });
});
