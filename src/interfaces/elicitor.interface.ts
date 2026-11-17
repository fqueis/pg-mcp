/**
 * The way the server asks the human a yes/no question through the MCP client.
 * This is the boundary to the client: production wires MCP elicitation, tests wire a fake.
 */
export interface Elicitor {
  /**
   * Whether the connected client can show a question to the human.
   *
   * @returns `true` when `confirm` can reach the human.
   */
  isSupported(): boolean;

  /**
   * Asks the human to approve something.
   *
   * @param message - What the human is asked to approve.
   * @returns `true` only when the human explicitly approved; declining or cancelling is `false`.
   */
  confirm(message: string): Promise<boolean>;
}
