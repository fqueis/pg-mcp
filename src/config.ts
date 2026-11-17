import { homedir } from 'node:os';
import path from 'node:path';

import {
  DEFAULT_MAX_ROWS,
  DEFAULT_REGISTRY_TTL_MS,
  DEFAULT_STATEMENT_TIMEOUT_MS,
  EnvVar,
  POSITIVE_INTEGER_PATTERN,
  REGISTRY_DIRECTORY_NAME,
  REGISTRY_FILE_NAME,
  TRUTHY_ENV_VALUES,
} from '@constants/config.constants.js';
import { WritePolicyMode } from '@constants/write-policy.constants.js';
import type { WritePolicyModeType } from '@constants/write-policy.constants.js';
import type { AppConfig } from '@interfaces/app-config.interface.js';

/**
 * Reads a strictly positive integer setting.
 *
 * @param value - Raw environment value.
 * @param fallback - Value used when the setting is missing, not a plain integer, or zero.
 * @returns The parsed integer, or the fallback.
 */
function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || !POSITIVE_INTEGER_PATTERN.test(value)) return fallback;
  const parsed = Number(value);
  return parsed > 0 ? parsed : fallback;
}

/**
 * Resolves the write policy mode. `PG_MCP_WRITES` wins; otherwise a truthy
 * `PG_MCP_ENABLE_WRITES` means `on`; anything else asks the human, the safe default.
 *
 * @param env - Process environment.
 * @returns The write policy mode.
 */
function resolveWriteMode(env: NodeJS.ProcessEnv): WritePolicyModeType {
  const explicit = env[EnvVar.WRITES]?.toLowerCase();
  const modes: readonly string[] = Object.values(WritePolicyMode);
  if (explicit !== undefined && modes.includes(explicit)) return explicit as WritePolicyModeType;

  const flag = env[EnvVar.ENABLE_WRITES]?.toLowerCase();
  if (flag !== undefined && TRUTHY_ENV_VALUES.includes(flag) && explicit === undefined) return WritePolicyMode.ON;

  return WritePolicyMode.ASK;
}

/**
 * Builds the server settings from environment variables.
 *
 * Invalid numbers and unknown write modes fall back to safe defaults instead of
 * failing, so a typo never stops the server or turns writes on.
 *
 * @param env - Process environment; defaults to `process.env`.
 * @param homeDir - Home directory that holds the default registry; defaults to the current user's.
 * @returns The resolved settings.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, homeDir: string = homedir()): AppConfig {
  return {
    registryPath: env[EnvVar.REGISTRY_PATH] || path.join(homeDir, REGISTRY_DIRECTORY_NAME, REGISTRY_FILE_NAME),
    registryTtlMs: parsePositiveInteger(env[EnvVar.REGISTRY_TTL_MS], DEFAULT_REGISTRY_TTL_MS),
    writeMode: resolveWriteMode(env),
    maxRows: parsePositiveInteger(env[EnvVar.MAX_ROWS], DEFAULT_MAX_ROWS),
    statementTimeoutMs: parsePositiveInteger(env[EnvVar.STATEMENT_TIMEOUT_MS], DEFAULT_STATEMENT_TIMEOUT_MS),
  };
}
