import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { ToolField, ToolMetadata } from '@constants/tool.constants.js';
import type { PgMcpService } from '@services/pg-mcp.service.js';
import { errorResult, jsonResult } from '@utils/tool-result.utils.js';

/**
 * Registers the statement tools: a read-only query and a statement that changes data.
 *
 * `execute` is always registered. Whether it runs is decided by the write
 * policy inside the service: refused, approved by the human, or allowed.
 *
 * @param server - MCP server instance.
 * @param service - Application service that owns connections and pools.
 */
export function registerQueryTools(server: McpServer, service: PgMcpService): void {
  /** A bound parameter: the scalar JSON types PostgreSQL accepts as a value. */
  const paramValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

  server.registerTool(
    ToolMetadata.QUERY.name,
    {
      title: ToolMetadata.QUERY.title,
      description: ToolMetadata.QUERY.description,
      inputSchema: {
        connectionId: z.string().describe(ToolField.CONNECTION_ID),
        sql: z.string().describe(ToolField.QUERY_SQL),
        params: z.array(paramValue).optional().describe(ToolField.PARAMS),
        maxRows: z.number().int().positive().optional().describe(ToolField.MAX_ROWS),
      },
    },
    async (args) => {
      try {
        return jsonResult(await service.query(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    ToolMetadata.EXECUTE.name,
    {
      title: ToolMetadata.EXECUTE.title,
      description: ToolMetadata.EXECUTE.description,
      inputSchema: {
        connectionId: z.string().describe(ToolField.CONNECTION_ID),
        sql: z.string().describe(ToolField.EXECUTE_SQL),
        params: z.array(paramValue).optional().describe(ToolField.PARAMS),
        confirmedByUser: z.boolean().optional().describe(ToolField.CONFIRMED_BY_USER),
      },
    },
    async (args) => {
      try {
        return jsonResult(await service.execute(args));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
