/**
 * Actions a client reports when the human answers an elicitation.
 */
export const ElicitationAction = {
  /** The human submitted the form. */
  ACCEPT: 'accept',
  /** The human explicitly declined. */
  DECLINE: 'decline',
  /** The human dismissed the question without choosing. */
  CANCEL: 'cancel',
} as const;

/** Name of the boolean field the human ticks to approve a change. */
export const ELICITATION_APPROVE_FIELD = 'approve';

/** Label of the approval field in the client's form. */
export const ELICITATION_APPROVE_TITLE = 'Allow this change';

/** Help text of the approval field in the client's form. */
export const ELICITATION_APPROVE_DESCRIPTION = 'Tick to let the server run this statement on the database.';
