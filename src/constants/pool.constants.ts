/** Maximum connections one registered database may hold open. An agent session needs few. */
export const POOL_MAX_CONNECTIONS = 3;

/** Milliseconds an idle connection stays open before it is closed. */
export const POOL_IDLE_TIMEOUT_MS = 30_000;

/** Milliseconds to wait for a connection before giving up, so an unreachable host fails fast. */
export const POOL_CONNECTION_TIMEOUT_MS = 10_000;

/**
 * Wire protocol that accepts exactly one statement per query. The default protocol takes several
 * statements in one string, which would let a `COMMIT` inside the text end the read-only transaction.
 */
export const POOL_QUERY_MODE_EXTENDED = 'extended';
