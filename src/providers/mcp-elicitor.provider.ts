import {
  ELICITATION_APPROVE_DESCRIPTION,
  ELICITATION_APPROVE_FIELD,
  ELICITATION_APPROVE_TITLE,
  ElicitationAction,
} from '@constants/elicitation.constants.js';
import type { Elicitor } from '@interfaces/elicitor.interface.js';
import type { ElicitationServer } from '@interfaces/elicitation-server.interface.js';

/**
 * Asks the human a yes/no question through MCP elicitation: the client shows a
 * form with one approval checkbox.
 *
 * Every outcome other than an explicit, ticked acceptance counts as "no", so a
 * failure to reach the human can never approve a write.
 */
export class McpElicitorProvider implements Elicitor {
  constructor(private readonly server: ElicitationServer) {}

  /**
   * Reports whether the connected client declared the elicitation capability.
   *
   * @returns `true` when a form can be shown to the human.
   */
  isSupported(): boolean {
    return this.server.getClientCapabilities()?.elicitation !== undefined;
  }

  /**
   * Shows the message with an approval checkbox and waits for the human.
   *
   * @param message - What the human is asked to approve.
   * @returns `true` only when the human accepted the form with the box ticked.
   */
  async confirm(message: string): Promise<boolean> {
    try {
      const result = await this.server.elicitInput({
        message,
        requestedSchema: {
          type: 'object',
          properties: {
            [ELICITATION_APPROVE_FIELD]: {
              type: 'boolean',
              title: ELICITATION_APPROVE_TITLE,
              description: ELICITATION_APPROVE_DESCRIPTION,
            },
          },
          required: [ELICITATION_APPROVE_FIELD],
        },
      });
      return result.action === ElicitationAction.ACCEPT && result.content?.[ELICITATION_APPROVE_FIELD] === true;
    } catch {
      return false;
    }
  }
}
