import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { ConnectionSourceKind } from '@constants/connection-source-kind.constants.js';
import { TEXT_FILE_ENCODING } from '@constants/encoding.constants.js';
import { ErrorMessage } from '@constants/error-messages.constants.js';
import type { ConnectionSource } from '@app-types/connection-source.type.js';

/**
 * Turns a stored connection source into a connection string at connect time.
 *
 * Reference sources (`env`, `envFile`) are read on every call, so a changed
 * `.env` takes effect after the connection is refreshed. Error messages name
 * the variable, key, or file, never a secret value.
 *
 * @param source - Where the connection string comes from.
 * @param env - Environment to read `env` sources from; defaults to `process.env`.
 * @returns The connection string.
 * @throws {@link Error} when a referenced variable, file, or key is missing or empty.
 */
export async function resolveConnectionString(
  source: ConnectionSource,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  switch (source.kind) {
    case ConnectionSourceKind.LITERAL:
      return source.databaseUrl;
    case ConnectionSourceKind.ENV: {
      const value = env[source.envVar];
      if (!value) throw new Error(ErrorMessage.envVarNotSet(source.envVar));
      return value;
    }
    case ConnectionSourceKind.ENV_FILE: {
      let content: string;
      try {
        content = await readFile(source.envFile, TEXT_FILE_ENCODING);
      } catch {
        throw new Error(ErrorMessage.envFileUnreadable(source.envFile));
      }
      const value = parse(content)[source.envKey];
      if (!value) throw new Error(ErrorMessage.envKeyNotSet(source.envKey, source.envFile));
      return value;
    }
  }
}
