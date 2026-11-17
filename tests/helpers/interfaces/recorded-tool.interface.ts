import type { ToolHandler } from '@tests/helpers/types/tool-handler.type.js';

/**
 * A tool as captured by the recording server.
 */
export interface RecordedTool {
  /** The registration config: title, description, and input schema. */
  config: unknown;
  /** The handler the tool runs. */
  handler: ToolHandler;
}
