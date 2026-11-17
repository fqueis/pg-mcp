import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ToolMetadata } from '@constants/tool.constants.js';
import { registerConnectionTools } from '@tools/connections.tool.js';
import { SHOP_URL } from '@tests/helpers/constants/connection-fixtures.constants.js';
import { RecordingMcpServerProvider } from '@tests/helpers/fakes/recording-mcp-server.provider.js';
import { createServiceHarness } from '@tests/helpers/utils/create-service.utils.js';
import { parseToolJson, toolErrorText } from '@tests/helpers/utils/tool-result.utils.js';
import type { ServiceHarness } from '@tests/helpers/interfaces/service-harness.interface.js';

/**
 * Seam: the connection tools as the MCP server exposes them, over a real service.
 *
 * Out of scope: SDK input validation and the transport.
 */
describe('registerConnectionTools', () => {
  let harness: ServiceHarness;
  let recorder: RecordingMcpServerProvider;

  beforeEach(async () => {
    harness = await createServiceHarness();
    recorder = new RecordingMcpServerProvider();
    registerConnectionTools(recorder.server, harness.service);
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  it('registers the five connection tools', () => {
    expect(recorder.toolNames()).toEqual([
      'use_connection',
      'list_connections',
      'forget_connection',
      'clear_connections',
      'refresh_connection',
    ]);
  });

  it('registers a connection and returns its target without the password', async () => {
    const result = await recorder.call(ToolMetadata.USE_CONNECTION.name, { databaseUrl: SHOP_URL });

    expect(parseToolJson(result)).toMatchObject({ id: 'localhost-5432-shop', host: 'localhost', database: 'shop' });
    expect(JSON.stringify(result)).not.toContain('s3cret');
  });

  it('returns an error result, not a thrown exception, when no credential source is given', async () => {
    const result = await recorder.call(ToolMetadata.USE_CONNECTION.name, {});

    expect(toolErrorText(result)).toMatch(/credential source/);
  });

  it('lists the registered connections', async () => {
    await recorder.call(ToolMetadata.USE_CONNECTION.name, { databaseUrl: SHOP_URL });

    const result = await recorder.call(ToolMetadata.LIST_CONNECTIONS.name);

    expect(parseToolJson(result)).toMatchObject({ connections: [{ id: 'localhost-5432-shop' }] });
  });

  it('forgets a connection and reports whether it existed', async () => {
    await recorder.call(ToolMetadata.USE_CONNECTION.name, { databaseUrl: SHOP_URL });

    const first = await recorder.call(ToolMetadata.FORGET_CONNECTION.name, { connectionId: 'localhost-5432-shop' });
    const second = await recorder.call(ToolMetadata.FORGET_CONNECTION.name, { connectionId: 'localhost-5432-shop' });

    expect(parseToolJson(first)).toEqual({ connectionId: 'localhost-5432-shop', removed: true });
    expect(parseToolJson(second)).toEqual({ connectionId: 'localhost-5432-shop', removed: false });
  });

  it('clears every connection and reports how many were removed', async () => {
    await recorder.call(ToolMetadata.USE_CONNECTION.name, { databaseUrl: SHOP_URL });

    const result = await recorder.call(ToolMetadata.CLEAR_CONNECTIONS.name);

    expect(parseToolJson(result)).toEqual({ removed: 1 });
  });

  it('refreshes a registered connection', async () => {
    await recorder.call(ToolMetadata.USE_CONNECTION.name, { databaseUrl: SHOP_URL });

    const result = await recorder.call(ToolMetadata.REFRESH_CONNECTION.name, { connectionId: 'localhost-5432-shop' });

    expect(parseToolJson(result)).toMatchObject({ id: 'localhost-5432-shop' });
  });

  it('returns an error result when refreshing an unknown connection', async () => {
    const result = await recorder.call(ToolMetadata.REFRESH_CONNECTION.name, { connectionId: 'unknown' });

    expect(toolErrorText(result)).toMatch(/unknown/);
  });
});
