import type { ClientCapabilities, ElicitRequestFormParams, ElicitResult } from '@modelcontextprotocol/sdk/types.js';

import type { ElicitationServer } from '@interfaces/elicitation-server.interface.js';

/**
 * Stand-in for the MCP low-level server. It reports fixed client capabilities,
 * records the forms it is asked to show, and answers with a fixed result or error.
 */
export class FakeElicitationServer implements ElicitationServer {
  /** Forms received, in order. */
  readonly requests: ElicitRequestFormParams[] = [];

  /**
   * @param capabilities - What the fake client declared at initialization.
   * @param answer - What the human did, or an error the client raises.
   */
  constructor(
    private readonly capabilities: ClientCapabilities | undefined,
    private readonly answer: ElicitResult | Error = { action: 'cancel' },
  ) {}

  /**
   * Reports the capabilities given at construction.
   *
   * @returns The fixed capabilities.
   */
  getClientCapabilities(): ClientCapabilities | undefined {
    return this.capabilities;
  }

  /**
   * Records the form and answers with the fixed result.
   *
   * @param params - The form the server shows.
   * @returns The fixed result.
   * @throws The fixed error, when one was given.
   */
  elicitInput(params: ElicitRequestFormParams): Promise<ElicitResult> {
    this.requests.push(params);
    return this.answer instanceof Error ? Promise.reject(this.answer) : Promise.resolve(this.answer);
  }
}
