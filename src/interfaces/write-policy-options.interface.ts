import type { WritePolicyModeType } from '@constants/write-policy.constants.js';
import type { Elicitor } from '@interfaces/elicitor.interface.js';

/**
 * Options for `WritePolicy`.
 */
export interface WritePolicyOptions {
  /** Whether writes are refused, asked about, or allowed. */
  mode: WritePolicyModeType;
  /** How to ask the human when `mode` is `ask`. */
  elicitor: Elicitor;
}
