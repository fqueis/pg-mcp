import type { ConnectionTarget } from '@interfaces/connection-target.interface.js';

/**
 * Result of registering a connection. Contains no credential.
 */
export interface UseConnectionResult extends ConnectionTarget {
  /** Id to pass as `connectionId` to the other tools. */
  id: string;
  /** Server version reported by `SHOW server_version`. */
  serverVersion: string;
}
