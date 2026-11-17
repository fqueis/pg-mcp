import type { ToolResult } from '@interfaces/tool-result.interface.js';

/**
 * Builds a successful MCP tool result carrying a JSON document as text.
 *
 * @param data - Serializable payload.
 * @returns The tool result.
 */
export function jsonResult(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/**
 * Builds an MCP tool error result with a message the agent can act on.
 *
 * @param error - The thrown value; its message is returned as text.
 * @returns The tool result, flagged as an error.
 */
export function errorResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, content: [{ type: 'text', text: message }] };
}
