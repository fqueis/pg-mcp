import { describe, expect, it } from 'vitest';

import { ElicitationAction, ELICITATION_APPROVE_FIELD } from '@constants/elicitation.constants.js';
import { McpElicitorProvider } from '@providers/mcp-elicitor.provider.js';
import { FakeElicitationServer } from '@tests/helpers/fakes/fake-elicitation-server.provider.js';

/**
 * Seam: `McpElicitorProvider` turns a yes/no question into an MCP elicitation.
 *
 * Out of scope: the transport and the real SDK server.
 */
describe('McpElicitorProvider', () => {
  describe('isSupported', () => {
    it('is false when the client did not declare elicitation', () => {
      expect(new McpElicitorProvider(new FakeElicitationServer({})).isSupported()).toBe(false);
    });

    it('is false before the client has initialized', () => {
      expect(new McpElicitorProvider(new FakeElicitationServer(undefined)).isSupported()).toBe(false);
    });

    it('is true when the client declared elicitation', () => {
      expect(new McpElicitorProvider(new FakeElicitationServer({ elicitation: {} })).isSupported()).toBe(true);
    });
  });

  describe('confirm', () => {
    it('shows the message with one boolean approval field', async () => {
      const server = new FakeElicitationServer(
        { elicitation: {} },
        { action: ElicitationAction.ACCEPT, content: { [ELICITATION_APPROVE_FIELD]: true } },
      );

      await new McpElicitorProvider(server).confirm('Delete everything?');

      expect(server.requests).toHaveLength(1);
      expect(server.requests[0]?.message).toBe('Delete everything?');
      expect(server.requests[0]?.requestedSchema.required).toEqual([ELICITATION_APPROVE_FIELD]);
      expect(server.requests[0]?.requestedSchema.properties[ELICITATION_APPROVE_FIELD]).toMatchObject({
        type: 'boolean',
      });
    });

    it('approves only when the human accepts and ticks the box', async () => {
      const server = new FakeElicitationServer(
        { elicitation: {} },
        { action: ElicitationAction.ACCEPT, content: { [ELICITATION_APPROVE_FIELD]: true } },
      );

      expect(await new McpElicitorProvider(server).confirm('ok?')).toBe(true);
    });

    it('does not approve when the human accepts the form without ticking the box', async () => {
      const server = new FakeElicitationServer(
        { elicitation: {} },
        { action: ElicitationAction.ACCEPT, content: { [ELICITATION_APPROVE_FIELD]: false } },
      );

      expect(await new McpElicitorProvider(server).confirm('ok?')).toBe(false);
    });

    it.each([ElicitationAction.DECLINE, ElicitationAction.CANCEL])(
      'does not approve when the human chooses %s',
      async (action) => {
        const server = new FakeElicitationServer({ elicitation: {} }, { action });

        expect(await new McpElicitorProvider(server).confirm('ok?')).toBe(false);
      },
    );

    it('does not approve when the client fails to show the question', async () => {
      const server = new FakeElicitationServer({ elicitation: {} }, new Error('transport closed'));

      expect(await new McpElicitorProvider(server).confirm('ok?')).toBe(false);
    });
  });
});
