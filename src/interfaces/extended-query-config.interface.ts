import type { QueryConfig } from 'pg';

/**
 * A `pg` query that names the wire protocol it must use.
 *
 * `queryMode` exists in the driver but not in its type definitions, so it is
 * declared here instead of being cast at the call site.
 */
export interface ExtendedQueryConfig extends QueryConfig {
  /** `extended` makes the server parse the text as exactly one statement, whether or not there are parameters. */
  queryMode: 'extended';
}
