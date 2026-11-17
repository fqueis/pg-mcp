/**
 * Result an MCP tool handler returns: one text block, optionally flagged as an error.
 */
export interface ToolResult {
  /** Present and `true` when the call failed. */
  isError?: true;
  /** The text blocks shown to the agent. */
  content: { type: 'text'; text: string }[];
  /** Index signature required by the SDK's result type. */
  [key: string]: unknown;
}
