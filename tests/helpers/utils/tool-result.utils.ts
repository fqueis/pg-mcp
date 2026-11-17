import type { ToolResult } from '@interfaces/tool-result.interface.js';

/**
 * Reads the JSON document out of a successful tool result.
 *
 * @param result - Value a handler returned.
 * @returns The parsed document.
 * @throws {@link Error} when the result is an error or holds no text block.
 */
export function parseToolJson(result: unknown): unknown {
  const { isError, content } = result as ToolResult;
  if (isError) throw new Error(`Tool failed: ${content[0]?.text}`);
  return JSON.parse(content[0]?.text ?? '');
}

/**
 * Reads the message out of an error tool result.
 *
 * @param result - Value a handler returned.
 * @returns The error text.
 * @throws {@link Error} when the result is not an error.
 */
export function toolErrorText(result: unknown): string {
  const { isError, content } = result as ToolResult;
  if (!isError) throw new Error('Expected an error result');
  return content[0]?.text ?? '';
}
