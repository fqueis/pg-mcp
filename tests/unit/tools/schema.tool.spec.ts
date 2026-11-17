import { afterEach, describe, expect, it } from 'vitest';

import { CatalogQuery } from '@constants/catalog.constants.js';
import { ToolMetadata } from '@constants/tool.constants.js';
import { registerSchemaTools } from '@tools/schema.tool.js';
import { SHOP_URL } from '@tests/helpers/constants/connection-fixtures.constants.js';
import { RecordingMcpServerProvider } from '@tests/helpers/fakes/recording-mcp-server.provider.js';
import { catalogAnswer, readCatalogSql } from '@tests/helpers/utils/catalog-sql.utils.js';
import { createServiceHarness } from '@tests/helpers/utils/create-service.utils.js';
import { parseToolJson, toolErrorText } from '@tests/helpers/utils/tool-result.utils.js';
import type { ServiceHarness } from '@tests/helpers/interfaces/service-harness.interface.js';

/**
 * Seam: the schema tools as the MCP server exposes them, over a real service.
 *
 * Out of scope: the catalog SQL itself, covered by the real-PostgreSQL spec.
 */
describe('registerSchemaTools', () => {
  const connectionId = 'localhost-5432-shop';
  let harness: ServiceHarness | undefined;

  afterEach(async () => {
    await harness?.cleanup();
  });

  /**
   * Builds a harness whose fake database answers one catalog query, with the tools registered and a connection ready.
   *
   * @param query - Catalog query to script.
   * @param document - JSON document the query answers with.
   * @returns The recording server to call tools on.
   */
  const setUp = async (query: (typeof CatalogQuery)[keyof typeof CatalogQuery], document: unknown) => {
    const sql = await readCatalogSql(query);
    harness = await createServiceHarness((text) => (text === sql ? catalogAnswer(document) : undefined));
    const recorder = new RecordingMcpServerProvider();
    registerSchemaTools(recorder.server, harness.service);
    await harness.service.useConnection({ databaseUrl: SHOP_URL });
    return recorder;
  };

  it('registers the three schema tools', async () => {
    const recorder = await setUp(CatalogQuery.LIST_SCHEMAS, []);

    expect(recorder.toolNames()).toEqual(['list_schemas', 'list_tables', 'describe_table']);
  });

  it('lists schemas', async () => {
    const recorder = await setUp(CatalogQuery.LIST_SCHEMAS, ['public', 'sales']);

    const result = await recorder.call(ToolMetadata.LIST_SCHEMAS.name, { connectionId });

    expect(parseToolJson(result)).toEqual({ schemas: ['public', 'sales'] });
  });

  it('lists tables', async () => {
    const tables = [{ name: 'orders', type: 'table' }];
    const recorder = await setUp(CatalogQuery.LIST_TABLES, tables);

    const result = await recorder.call(ToolMetadata.LIST_TABLES.name, { connectionId });

    expect(parseToolJson(result)).toEqual({ schema: 'public', tables });
  });

  it('describes a table', async () => {
    const description = {
      schema: 'public',
      table: 'orders',
      columns: [],
      primaryKey: [],
      foreignKeys: [],
      indexes: [],
    };
    const recorder = await setUp(CatalogQuery.DESCRIBE_TABLE, description);

    const result = await recorder.call(ToolMetadata.DESCRIBE_TABLE.name, { connectionId, table: 'orders' });

    expect(parseToolJson(result)).toEqual(description);
  });

  it('returns an error result for an unknown connection', async () => {
    const recorder = await setUp(CatalogQuery.LIST_SCHEMAS, []);

    const result = await recorder.call(ToolMetadata.LIST_SCHEMAS.name, { connectionId: 'unknown' });

    expect(toolErrorText(result)).toMatch(/unknown/);
  });
});
