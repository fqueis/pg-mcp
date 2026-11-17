import type { Elicitor } from '@interfaces/elicitor.interface.js';

/**
 * Stand-in for the MCP client's ability to ask the human. It records every
 * question and answers with a fixed decision.
 */
export class FakeElicitor implements Elicitor {
  /** Questions received, in order. */
  readonly messages: string[] = [];

  /**
   * @param supported - Whether the fake client can show questions.
   * @param approves - What the human answers when asked.
   */
  constructor(
    private readonly supported: boolean,
    private readonly approves: boolean = false,
  ) {}

  /**
   * Reports whether the fake client can show questions.
   *
   * @returns The value given at construction.
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Records the question and answers with the fixed decision.
   *
   * @param message - What the human is asked to approve.
   * @returns The fixed decision.
   */
  confirm(message: string): Promise<boolean> {
    this.messages.push(message);
    return Promise.resolve(this.approves);
  }
}
