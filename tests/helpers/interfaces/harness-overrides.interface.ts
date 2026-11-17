import type { WritePolicyModeType } from '@constants/write-policy.constants.js';
import type { Elicitor } from '@interfaces/elicitor.interface.js';

/**
 * Optional write-policy settings of `createServiceHarness`.
 */
export interface HarnessOverrides {
  /** Write policy mode; defaults to refusing writes. */
  writeMode?: WritePolicyModeType;
  /** How the fake client answers questions; defaults to a client that cannot ask. */
  elicitor?: Elicitor;
}
