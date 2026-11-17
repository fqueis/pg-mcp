import type { ConnectionTarget } from '@interfaces/connection-target.interface.js';

/**
 * How the server treats a statement that changes data.
 *
 * `off` refuses every write. `ask` asks the human before each write. `on`
 * allows writes without asking.
 */
export const WritePolicyMode = {
  /** Every write is refused. */
  OFF: 'off',
  /** The human is asked before each write. */
  ASK: 'ask',
  /** Writes run without asking. */
  ON: 'on',
} as const;

/**
 * Union of {@link WritePolicyMode} values.
 */
export type WritePolicyModeType = (typeof WritePolicyMode)[keyof typeof WritePolicyMode];

/**
 * Text of the confirmation shown to the human before a write.
 */
export const WritePrompt = {
  /**
   * Builds the question: which database the write targets and exactly what runs.
   * It never contains the password.
   */
  message: (id: string, target: ConnectionTarget, sql: string, params: unknown[] | undefined): string =>
    [
      'Allow this change to the database?',
      `Connection: ${id} (${target.user}@${target.host}:${target.port}/${target.database})`,
      `SQL: ${sql}`,
      `Parameters: ${JSON.stringify(params ?? [])}`,
    ].join('\n'),
} as const;
