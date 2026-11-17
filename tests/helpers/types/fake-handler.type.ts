import type { FakeAnswer } from './fake-answer.type.js';

/**
 * Chooses the answer for a statement. Returning `undefined` falls back to the
 * default answer (server version for `SHOW server_version`, otherwise an empty result).
 *
 * @param text - SQL text received by the fake.
 * @param params - Positional parameters received with it.
 */
export type FakeHandler = (text: string, params?: unknown[]) => FakeAnswer | undefined;
