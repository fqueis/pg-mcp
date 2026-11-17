import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * What tool specs use from the recording server.
 */
export interface RecordingMcpServer {
  /** Stub cast as `McpServer`, passed to `register*Tools`. */
  server: McpServer;
  /**
   * Lists the registered tool names.
   *
   * @returns Names in registration order.
   */
  toolNames(): string[];
  /**
   * Invokes a registered tool handler.
   *
   * @param name - Tool name.
   * @param args - Tool arguments.
   * @returns The handler result.
   */
  call(name: string, args?: Record<string, unknown>): Promise<unknown>;
}
