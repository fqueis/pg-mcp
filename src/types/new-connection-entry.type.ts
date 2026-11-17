import type { ConnectionEntry } from '@interfaces/connection-entry.interface.js';

/**
 * Entry data a caller provides when registering a connection. The registry
 * stamps `lastUsedAt` itself.
 */
export type NewConnectionEntry = Omit<ConnectionEntry, 'lastUsedAt'>;
