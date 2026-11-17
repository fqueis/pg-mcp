import type { ConnectionSourceKindType } from '@constants/connection-source-kind.constants.js';
import type { ConnectionTarget } from '@interfaces/connection-target.interface.js';

/**
 * A registered connection as shown to the agent. Contains no credential and no
 * reference to where one is stored.
 */
export interface ConnectionSummary extends ConnectionTarget {
  /** Id to pass as `connectionId` to the other tools. */
  id: string;
  /** Kind of credential source the connection was registered with. */
  sourceKind: ConnectionSourceKindType;
  /** Epoch milliseconds of the last registration or use. */
  lastUsedAt: number;
}
