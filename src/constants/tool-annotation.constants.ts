/**
 * Behavior hints every MCP tool declares, so a client can decide how much to trust a call
 * (auto-run a read, ask before a delete) without reading the tool's description.
 *
 * All four hints are always set to an explicit boolean: a client may treat a missing hint
 * as the riskiest value, and some directories reject a tool that leaves one out.
 */
export const ToolAnnotation = {
  /** Reads the registry or the database catalog and changes nothing. Repeating it gives the same result. */
  READ: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  /** Saves or reopens a connection. Changes only the local registry; repeating it leaves the same state. */
  REGISTER: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  /** Deletes registered connections from the local registry. Repeating it changes nothing more. */
  REMOVE: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  /** Runs a statement that changes data in the user's database. Repeating it can change data again. */
  WRITE: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
} as const;
