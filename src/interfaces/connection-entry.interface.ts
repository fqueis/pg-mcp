import type { ConnectionTarget } from '@interfaces/connection-target.interface.js';
import type { ConnectionSource } from '@app-types/connection-source.type.js';

/**
 * A connection as persisted in the registry file.
 *
 * @see ConnectionSource - How the connection string is obtained at connect time
 */
export interface ConnectionEntry extends ConnectionTarget {
  /** Stable id the agent uses to refer to the connection. */
  id: string;
  /** How to obtain the connection string at connect time. */
  source: ConnectionSource;
  /** Epoch milliseconds of the last registration or use; drives the sliding TTL. */
  lastUsedAt: number;
}
