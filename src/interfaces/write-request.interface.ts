import type { ConnectionTarget } from '@interfaces/connection-target.interface.js';

/**
 * A statement waiting for permission to change data.
 */
export interface WriteRequest {
  /** Id of the connection the statement targets. */
  connectionId: string;
  /** Non-secret description of that connection, shown to the human. */
  target: ConnectionTarget;
  /** The SQL that would run. */
  sql: string;
  /** Values bound to the placeholders. */
  params?: unknown[];
  /** The agent's claim that the human already approved in chat; honored only when the client cannot ask. */
  confirmedByUser?: boolean;
}
