import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { ToolField, ToolMetadata } from '@constants/tool.constants.js';
import type { PgMcpService } from '@services/pg-mcp.service.js';
import { errorResult, jsonResult } from '@utils/tool-result.utils.js';

/**
 * Registers the connection lifecycle tools: use, list, forget, clear, refresh.
 *
 * The tools are thin adapters: they validate input with Zod, call the service,
 * and map any thrown error to an error result the agent can read.
 *
 * @param server - MCP server instance.
 * @param service - Application service that owns connections and pools.
 */
export function registerConnectionTools(server: McpServer, service: PgMcpService): void {
  server.registerTool(
    ToolMetadata.USE_CONNECTION.name,
    {
      title: ToolMetadata.USE_CONNECTION.title,
      description: ToolMetadata.USE_CONNECTION.description,
      inputSchema: {
        databaseUrl: z.string().optional().describe(ToolField.DATABASE_URL),
        envVar: z.string().optional().describe(ToolField.ENV_VAR),
        envFile: z.string().optional().describe(ToolField.ENV_FILE),
        envKey: z.string().optional().describe(ToolField.ENV_KEY),
        id: z.string().optional().describe(ToolField.CONNECTION_NEW_ID),
      },
    },
    async (args) => {
      try {
        return jsonResult(await service.useConnection(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    ToolMetadata.LIST_CONNECTIONS.name,
    {
      title: ToolMetadata.LIST_CONNECTIONS.title,
      description: ToolMetadata.LIST_CONNECTIONS.description,
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult({ connections: await service.listConnections() });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    ToolMetadata.FORGET_CONNECTION.name,
    {
      title: ToolMetadata.FORGET_CONNECTION.title,
      description: ToolMetadata.FORGET_CONNECTION.description,
      inputSchema: { connectionId: z.string().describe(ToolField.CONNECTION_ID) },
    },
    async (args) => {
      try {
        const removed = await service.forgetConnection(args.connectionId);
        return jsonResult({ connectionId: args.connectionId, removed });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    ToolMetadata.CLEAR_CONNECTIONS.name,
    {
      title: ToolMetadata.CLEAR_CONNECTIONS.title,
      description: ToolMetadata.CLEAR_CONNECTIONS.description,
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult({ removed: await service.clearConnections() });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    ToolMetadata.REFRESH_CONNECTION.name,
    {
      title: ToolMetadata.REFRESH_CONNECTION.title,
      description: ToolMetadata.REFRESH_CONNECTION.description,
      inputSchema: { connectionId: z.string().describe(ToolField.CONNECTION_ID) },
    },
    async (args) => {
      try {
        return jsonResult(await service.refreshConnection(args.connectionId));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
