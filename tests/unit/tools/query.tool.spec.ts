import { afterEach, describe, expect, it } from 'vitest';

import { WritePolicyMode } from '@constants/write-policy.constants.js';
import type { WritePolicyModeType } from '@constants/write-policy.constants.js';
import { ToolMetadata } from '@constants/tool.constants.js';
import { registerQueryTools } from '@tools/query.tool.js';
import { SHOP_URL } from '@tests/helpers/constants/connection-fixtures.constants.js';
import { FakeElicitor } from '@tests/helpers/fakes/fake-elicitor.provider.js';
import { RecordingMcpServerProvider } from '@tests/helpers/fakes/recording-mcp-server.provider.js';
import { createServiceHarness } from '@tests/helpers/utils/create-service.utils.js';
import { parseToolJson, toolErrorText } from '@tests/helpers/utils/tool-result.utils.js';
import type { ServiceHarness } from '@tests/helpers/interfaces/service-harness.interface.js';

/**
 * Seam: the query and execute tools as the MCP server exposes them, over a real service.
 *
 * Out of scope: the transaction SQL, covered by the service spec and the real-PostgreSQL spec.
 */
describe('registerQueryTools', () => {
  const connectionId = 'localhost-5432-shop';
  let harness: ServiceHarness | undefined;

  afterEach(async () => {
    await harness?.cleanup();
  });

  /**
   * Builds a harness with the tools registered and a connection ready.
   *
   * @param writeMode - Write policy mode of the service.
   * @param canAsk - Whether the fake client can ask the human.
   * @returns The recording server to call tools on.
   */
  const setUp = async (writeMode: WritePolicyModeType, canAsk = false) => {
    harness = await createServiceHarness(
      (text) => (text === 'SELECT 1 AS one' ? { rows: [{ one: 1 }], rowCount: 1 } : undefined),
      { writeMode, elicitor: new FakeElicitor(canAsk, canAsk) },
    );
    const recorder = new RecordingMcpServerProvider();
    registerQueryTools(recorder.server, harness.service);
    await harness.service.useConnection({ databaseUrl: SHOP_URL });
    return recorder;
  };

  it('registers query and execute', async () => {
    const recorder = await setUp(WritePolicyMode.OFF);

    expect(recorder.toolNames()).toEqual(['query', 'execute']);
  });

  it('runs a read-only query and returns the rows', async () => {
    const recorder = await setUp(WritePolicyMode.OFF);

    const result = await recorder.call(ToolMetadata.QUERY.name, { connectionId, sql: 'SELECT 1 AS one' });

    expect(parseToolJson(result)).toEqual({ rows: [{ one: 1 }], rowCount: 1, truncated: false });
  });

  it('returns an error result when the connection is unknown', async () => {
    const recorder = await setUp(WritePolicyMode.OFF);

    const result = await recorder.call(ToolMetadata.QUERY.name, { connectionId: 'unknown', sql: 'SELECT 1' });

    expect(toolErrorText(result)).toMatch(/unknown/);
  });

  it('returns an error result for execute when writes are off', async () => {
    const recorder = await setUp(WritePolicyMode.OFF);

    const result = await recorder.call(ToolMetadata.EXECUTE.name, { connectionId, sql: 'DELETE FROM orders' });

    expect(toolErrorText(result)).toMatch(/Writes are disabled/);
  });

  it('runs execute when writes are on', async () => {
    const recorder = await setUp(WritePolicyMode.ON);

    const result = await recorder.call(ToolMetadata.EXECUTE.name, { connectionId, sql: 'DELETE FROM orders' });

    expect(parseToolJson(result)).toEqual({ rowCount: 0, rows: [], truncated: false });
  });

  it('passes the confirmation claim through when the client cannot ask the human', async () => {
    const recorder = await setUp(WritePolicyMode.ASK, false);

    const refused = await recorder.call(ToolMetadata.EXECUTE.name, { connectionId, sql: 'DELETE FROM orders' });
    const allowed = await recorder.call(ToolMetadata.EXECUTE.name, {
      connectionId,
      sql: 'DELETE FROM orders',
      confirmedByUser: true,
    });

    expect(toolErrorText(refused)).toMatch(/confirmedByUser/);
    expect(parseToolJson(allowed)).toMatchObject({ rowCount: 0 });
  });
});
