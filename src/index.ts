#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from '@/config.js';
import {
  EXIT_CODE_FAILURE,
  SERVER_NAME,
  SHUTDOWN_SIGNALS,
  STARTUP_FAILURE_PREFIX,
} from '@constants/server.constants.js';
import { McpElicitorProvider } from '@providers/mcp-elicitor.provider.js';
import { createPgPool } from '@providers/pool.provider.js';
import { ConnectionRegistryService } from '@services/connection-registry.service.js';
import { PgMcpService } from '@services/pg-mcp.service.js';
import { WritePolicyService } from '@services/write-policy.service.js';
import { registerConnectionTools } from '@tools/connections.tool.js';
import { registerQueryTools } from '@tools/query.tool.js';
import { registerSchemaTools } from '@tools/schema.tool.js';
import { readPackageVersion } from '@utils/package-version.utils.js';

/**
 * Boots the PostgreSQL MCP server on stdio and closes the open pools on shutdown.
 *
 * Agents register databases on demand with `use_connection`, so nothing is
 * configured per project. Queries are read-only; writes follow the write policy
 * (`PG_MCP_WRITES`). Errors go to stderr because stdout carries MCP traffic.
 *
 * @returns Resolves when the transport is connected.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const server = new McpServer({ name: SERVER_NAME, version: readPackageVersion() });

  const service = new PgMcpService({
    registry: new ConnectionRegistryService({
      filePath: config.registryPath,
      ttlMs: config.registryTtlMs,
      now: () => Date.now(),
    }),
    createPool: createPgPool,
    maxRows: config.maxRows,
    statementTimeoutMs: config.statementTimeoutMs,
    writePolicy: new WritePolicyService({
      mode: config.writeMode,
      elicitor: new McpElicitorProvider(server.server),
    }),
  });

  registerConnectionTools(server, service);
  registerSchemaTools(server, service);
  registerQueryTools(server, service);

  /**
   * Closes the open pools, then exits. The registry is left alone, so connections stay registered for the next run.
   */
  const shutdown = (): void => {
    void service.close().finally(() => process.exit(0));
  };
  for (const signal of SHUTDOWN_SIGNALS) process.once(signal, shutdown);

  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${STARTUP_FAILURE_PREFIX} ${message}`);
  process.exit(EXIT_CODE_FAILURE);
});
