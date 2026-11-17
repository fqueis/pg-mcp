import type { ClientCapabilities, ElicitRequestFormParams, ElicitResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * The slice of the MCP low-level server that asks the human a question through
 * the client. The SDK `Server` satisfies it; tests wire a fake.
 */
export interface ElicitationServer {
  /**
   * Reads the capabilities the connected client declared.
   *
   * @returns The capabilities, or `undefined` before the client has initialized.
   */
  getClientCapabilities(): ClientCapabilities | undefined;

  /**
   * Shows a form to the human and waits for the answer.
   *
   * @param params - The question and the shape of the form.
   * @returns What the human did and, when they accepted, what they submitted.
   */
  elicitInput(params: ElicitRequestFormParams): Promise<ElicitResult>;
}
