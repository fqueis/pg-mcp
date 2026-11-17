/**
 * A tool handler as the SDK calls it: arguments in, a tool result out.
 *
 * @param args - The tool arguments, already validated by the SDK in production.
 */
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;
