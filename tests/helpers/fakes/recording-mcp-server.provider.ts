import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { RecordedTool } from '@tests/helpers/interfaces/recorded-tool.interface.js';
import type { RecordingMcpServer } from '@tests/helpers/interfaces/recording-mcp-server.interface.js';
import type { ToolHandler } from '@tests/helpers/types/tool-handler.type.js';

/**
 * Stand-in for the SDK `McpServer` at the registration boundary. It captures
 * the handlers passed to `registerTool` so tests can invoke a tool by name
 * without a transport.
 */
export class RecordingMcpServerProvider implements RecordingMcpServer {
  /** Tools registered so far, by name. */
  private readonly tools = new Map<string, RecordedTool>();

  /**
   * The object handed to `register*Tools`. It exposes only `registerTool`, the
   * one method those functions use.
   */
  readonly server = {
    registerTool: (name: string, config: unknown, handler: ToolHandler): void => {
      this.tools.set(name, { config, handler });
    },
  } as unknown as McpServer;

  /**
   * Lists the registered tool names.
   *
   * @returns Names in registration order.
   */
  toolNames(): string[] {
    return [...this.tools.keys()];
  }

  /**
   * Returns what a tool was registered with.
   *
   * @param name - Tool name.
   * @returns The registration config, such as its input schema.
   * @throws {@link Error} when the tool was not registered.
   */
  configOf(name: string): unknown {
    return this.requireTool(name).config;
  }

  /**
   * Invokes a registered tool handler.
   *
   * @param name - Tool name.
   * @param args - Tool arguments.
   * @returns The handler result.
   * @throws {@link Error} when the tool was not registered.
   */
  call(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return this.requireTool(name).handler(args);
  }

  /**
   * Looks up a registered tool.
   *
   * @param name - Tool name.
   * @returns The recorded registration.
   * @throws {@link Error} when the tool was not registered.
   */
  private requireTool(name: string): RecordedTool {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool "${name}" was not registered`);
    return tool;
  }
}
