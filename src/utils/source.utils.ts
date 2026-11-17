import { ConnectionSourceKind } from '@constants/connection-source-kind.constants.js';
import { ErrorMessage } from '@constants/error-messages.constants.js';
import type { UseConnectionInput } from '@interfaces/use-connection-input.interface.js';
import type { ConnectionSource } from '@app-types/connection-source.type.js';

/**
 * Picks the credential source from the tool input.
 *
 * @param input - Raw `use_connection` input.
 * @returns The single source the caller supplied.
 * @throws {@link Error} when no source, more than one source, or `envFile` without `envKey` is given.
 */
export function toConnectionSource(input: UseConnectionInput): ConnectionSource {
  const { databaseUrl, envVar, envFile, envKey } = input;
  const given = [databaseUrl, envVar, envFile].filter((value) => value !== undefined).length;

  if (given === 0) throw new Error(ErrorMessage.NO_CREDENTIAL_SOURCE);
  if (given > 1) throw new Error(ErrorMessage.MULTIPLE_CREDENTIAL_SOURCES);

  if (databaseUrl !== undefined) return { kind: ConnectionSourceKind.LITERAL, databaseUrl };
  if (envVar !== undefined) return { kind: ConnectionSourceKind.ENV, envVar };
  if (!envKey) throw new Error(ErrorMessage.ENV_FILE_REQUIRES_KEY);
  return { kind: ConnectionSourceKind.ENV_FILE, envFile: envFile as string, envKey };
}
