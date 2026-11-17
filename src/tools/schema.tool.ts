import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { DEFAULT_SCHEMA } from '@constants/catalog.constants.js';
import { ToolField, ToolMetadata } from '@constants/tool.constants.js';
import type { PgMcpService } from '@services/pg-mcp.service.js';
import { errorResult, jsonResult } from '@utils/tool-result.utils.js';

/**
 * Registers the schema exploration tools: list schemas, list tables, describe a table.
 *
 * The tools are thin adapters: they validate input with Zod, call the service,
 * and map any thrown error to an error result the agent can read.
 *
 * @param server - MCP server instance.
 * @param service - Application service that owns connections and pools.
 */
export function registerSchemaTools(server: McpServer, service: PgMcpService): void {
  server.registerTool(
    ToolMetadata.LIST_SCHEMAS.name,
    {
      title: ToolMetadata.LIST_SCHEMAS.title,
      description: ToolMetadata.LIST_SCHEMAS.description,
      inputSchema: { connectionId: z.string().describe(ToolField.CONNECTION_ID) },
    },
    async (args) => {
      try {
        return jsonResult({ schemas: await service.listSchemas(args.connectionId) });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    ToolMetadata.LIST_TABLES.name,
    {
      title: ToolMetadata.LIST_TABLES.title,
      description: ToolMetadata.LIST_TABLES.description,
      inputSchema: {
        connectionId: z.string().describe(ToolField.CONNECTION_ID),
        schema: z.string().optional().describe(ToolField.SCHEMA),
      },
    },
    async (args) => {
      try {
        const tables = await service.listTables(args);
        return jsonResult({ schema: args.schema ?? DEFAULT_SCHEMA, tables });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    ToolMetadata.DESCRIBE_TABLE.name,
    {
      title: ToolMetadata.DESCRIBE_TABLE.title,
      description: ToolMetadata.DESCRIBE_TABLE.description,
      inputSchema: {
        connectionId: z.string().describe(ToolField.CONNECTION_ID),
        table: z.string().describe(ToolField.TABLE),
        schema: z.string().optional().describe(ToolField.SCHEMA),
      },
    },
    async (args) => {
      try {
        return jsonResult(await service.describeTable(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
