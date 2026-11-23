import { afterEach, describe, expect, it } from 'vitest';

import { ToolAnnotation } from '@constants/tool-annotation.constants.js';
import { ToolMetadata } from '@constants/tool.constants.js';
import { registerConnectionTools } from '@tools/connections.tool.js';
import { registerQueryTools } from '@tools/query.tool.js';
import { registerSchemaTools } from '@tools/schema.tool.js';
import { RecordingMcpServerProvider } from '@tests/helpers/fakes/recording-mcp-server.provider.js';
import { createServiceHarness } from '@tests/helpers/utils/create-service.utils.js';
import type { ServiceHarness } from '@tests/helpers/interfaces/service-harness.interface.js';

/** The four hints of the MCP tool annotations. */
const HINTS = ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'] as const;

/**
 * Seam: the registration of every tool, read as a client reads `tools/list`.
 *
 * Behaviors verified:
 * 1. Every tool declares all four hints as explicit booleans, because a client may treat a
 *    missing hint as the riskiest value.
 * 2. Only `execute` is a write that can change user data, and only it is not idempotent.
 * 3. Reads claim to be read-only; the tools that delete registry entries claim to be destructive.
 *
 * Out of scope: how a client uses the hints.
 */
describe('tool annotations', () => {
  let harness: ServiceHarness | undefined;

  afterEach(async () => {
    await harness?.cleanup();
  });

  /**
   * Registers every tool on a recording server.
   *
   * @returns The recorder holding all registrations.
   */
  const registerAll = async () => {
    harness = await createServiceHarness();
    const recorder = new RecordingMcpServerProvider();
    registerConnectionTools(recorder.server, harness.service);
    registerSchemaTools(recorder.server, harness.service);
    registerQueryTools(recorder.server, harness.service);
    return recorder;
  };

  /**
   * Reads the annotations a tool was registered with.
   *
   * @param recorder - Recorder holding the registrations.
   * @param name - Tool name.
   * @returns The annotations object.
   */
  const annotationsOf = (recorder: RecordingMcpServerProvider, name: string) =>
    (recorder.configOf(name) as { annotations: Record<string, unknown> }).annotations;

  it('registers all twelve tools', async () => {
    const recorder = await registerAll();

    expect(recorder.toolNames()).toHaveLength(Object.keys(ToolMetadata).length);
  });

  it('gives every tool all four hints as booleans', async () => {
    const recorder = await registerAll();

    for (const name of recorder.toolNames()) {
      const annotations = annotationsOf(recorder, name);
      for (const hint of HINTS) {
        expect(typeof annotations[hint], `${name}.${hint}`).toBe('boolean');
      }
    }
  });

  it('marks the reads as read-only and non-destructive', async () => {
    const recorder = await registerAll();

    for (const meta of [
      ToolMetadata.QUERY,
      ToolMetadata.EXPLAIN,
      ToolMetadata.LIST_TABLES,
      ToolMetadata.LIST_CONNECTIONS,
    ]) {
      expect(annotationsOf(recorder, meta.name)).toEqual(ToolAnnotation.READ);
    }
  });

  it('marks execute as a destructive write that is not safe to repeat', async () => {
    const recorder = await registerAll();

    expect(annotationsOf(recorder, ToolMetadata.EXECUTE.name)).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    });
  });

  it('marks the tools that delete connections as destructive', async () => {
    const recorder = await registerAll();

    expect(annotationsOf(recorder, ToolMetadata.FORGET_CONNECTION.name)).toEqual(ToolAnnotation.REMOVE);
    expect(annotationsOf(recorder, ToolMetadata.CLEAR_CONNECTIONS.name)).toEqual(ToolAnnotation.REMOVE);
  });
});
