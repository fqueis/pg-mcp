import { ErrorMessage } from '@constants/error-messages.constants.js';
import { WritePolicyMode, WritePrompt } from '@constants/write-policy.constants.js';
import type { WritePolicyOptions } from '@interfaces/write-policy-options.interface.js';
import type { WriteRequest } from '@interfaces/write-request.interface.js';

/**
 * Decides whether a statement that changes data may run.
 *
 * It owns the permission decision only. It does not run SQL or open
 * connections; the service asks it before every write.
 *
 * In `ask` mode the human is asked through the client whenever the client can
 * ask. Only when it cannot does the agent's own `confirmedByUser` claim count,
 * and that is a soft guard because the agent controls the claim.
 */
export class WritePolicyService {
  constructor(private readonly options: WritePolicyOptions) {}

  /**
   * Allows a write or refuses it with an error.
   *
   * @param request - The statement waiting for permission.
   * @returns Resolves when the write is allowed.
   * @throws {@link Error} when writes are off, or the human does not approve.
   */
  authorize(request: WriteRequest): Promise<void> {
    switch (this.options.mode) {
      case WritePolicyMode.ON:
        return Promise.resolve();
      case WritePolicyMode.OFF:
        return Promise.reject(new Error(ErrorMessage.WRITES_DISABLED));
      case WritePolicyMode.ASK:
        return this.ask(request);
    }
  }

  /**
   * Asks the human to approve the write, or falls back to the agent's claim when
   * the client cannot ask.
   *
   * @param request - The statement waiting for permission.
   * @returns Resolves when the write is approved.
   * @throws {@link Error} when the human declines, or when the client cannot ask and the agent did not report an approval.
   */
  private async ask(request: WriteRequest): Promise<void> {
    const { elicitor } = this.options;

    if (elicitor.isSupported()) {
      const message = WritePrompt.message(request.connectionId, request.target, request.sql, request.params);
      if (!(await elicitor.confirm(message))) throw new Error(ErrorMessage.WRITE_NOT_APPROVED);
      return;
    }

    if (request.confirmedByUser !== true) throw new Error(ErrorMessage.WRITE_NEEDS_CONFIRMATION);
  }
}
