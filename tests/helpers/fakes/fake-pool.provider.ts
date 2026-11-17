import {
  SQL_COLUMN_SERVER_VERSION,
  SQL_DECLARE_CURSOR_PREFIX,
  SQL_FETCH_FORWARD_PREFIX,
  SQL_SHOW_SERVER_VERSION,
} from '@constants/sql.constants.js';
import type { DatabaseClient } from '@interfaces/database-client.interface.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';
import type { QueryResult } from '@interfaces/query-result.interface.js';
import { FAKE_SERVER_VERSION } from '@tests/helpers/constants/fake-pool.constants.js';
import type { FakeHandler } from '@tests/helpers/types/fake-handler.type.js';

/**
 * In-memory stand-in for the driver pool. It records every statement so tests
 * can assert on what reached the database, and answers through a scripted handler.
 *
 * It also behaves like a server-side cursor: `DECLARE` remembers the statement
 * and `FETCH FORWARD n` answers it with at most `n` rows, so tests can prove the
 * row limit is pushed to the database instead of applied after the full result.
 */
export class FakePool implements DatabasePool {
  /** Every statement received, in order, from the pool and from checked-out clients. */
  readonly statements: string[] = [];
  /** Whether `end()` was called. */
  ended = false;
  /** Number of clients checked out and not yet released. */
  outstandingClients = 0;
  /** The statement the open cursor was declared for, with its parameters. */
  private cursor: { sql: string; params?: unknown[] } | undefined;

  /**
   * @param handler - Optional script that chooses the answer for each statement. Unscripted statements get the default answer.
   */
  constructor(private readonly handler?: FakeHandler) {}

  /**
   * Records the statement and answers it like a pooled connection outside a transaction.
   *
   * @param text - SQL text.
   * @param params - Positional parameters.
   * @returns The scripted or default answer.
   */
  async query(text: string, params?: unknown[]): Promise<QueryResult> {
    return this.answer(text, params);
  }

  /**
   * Checks out a fake client that records its statements on this pool.
   *
   * @returns A client that must be released.
   */
  connect(): Promise<DatabaseClient> {
    this.outstandingClients += 1;
    const client: DatabaseClient = {
      query: (text, params) => this.answer(text, params),
      release: () => {
        this.outstandingClients -= 1;
      },
    };
    return Promise.resolve(client);
  }

  /**
   * Marks the pool as closed.
   */
  end(): Promise<void> {
    this.ended = true;
    return Promise.resolve();
  }

  /**
   * Records a statement and resolves or rejects with the scripted answer.
   * Cursor statements are emulated; everything else goes to the script.
   *
   * @param text - SQL text.
   * @param params - Positional parameters.
   * @returns The answer, or a rejection when the script answers with an error.
   */
  private answer(text: string, params?: unknown[]): Promise<QueryResult> {
    this.statements.push(text);
    if (text.startsWith(SQL_DECLARE_CURSOR_PREFIX)) return this.declare(text, params);
    if (text.startsWith(SQL_FETCH_FORWARD_PREFIX)) return this.fetch(text);
    return this.settle(this.handler?.(text, params) ?? this.defaultAnswer(text));
  }

  /**
   * Opens the emulated cursor. The script may refuse the `DECLARE` text, the way
   * a server refuses a statement that cannot be a cursor, such as `SHOW`.
   *
   * @param text - The full `DECLARE` statement.
   * @param params - Positional parameters of the declared statement.
   * @returns An empty result, or a rejection when the script refuses.
   */
  private declare(text: string, params?: unknown[]): Promise<QueryResult> {
    const scripted = this.handler?.(text, params);
    if (scripted instanceof Error) return Promise.reject(scripted);
    this.cursor = { sql: text.slice(SQL_DECLARE_CURSOR_PREFIX.length), params };
    return Promise.resolve({ rows: [], rowCount: 0 });
  }

  /**
   * Answers a `FETCH FORWARD n` with the declared statement's rows, at most `n`.
   *
   * @param text - The full `FETCH` statement.
   * @returns The first `n` rows, or a rejection when the declared statement fails when run.
   */
  private fetch(text: string): Promise<QueryResult> {
    const limit = Number(text.slice(SQL_FETCH_FORWARD_PREFIX.length).split(' ')[0]);
    const { sql, params } = this.cursor ?? { sql: '' };
    const answer = this.handler?.(sql, params) ?? this.defaultAnswer(sql);
    if (answer instanceof Error) return Promise.reject(answer);
    const rows = answer.rows.slice(0, limit);
    return Promise.resolve({ rows, rowCount: rows.length });
  }

  /**
   * Resolves a scripted answer, or rejects it when the script answered with an error.
   *
   * @param answer - The scripted or default answer.
   * @returns The answer as a promise.
   */
  private settle(answer: QueryResult | Error): Promise<QueryResult> {
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  }

  /**
   * Answers a statement the script did not handle: the server version for the version check, an empty result otherwise.
   *
   * @param text - SQL text.
   * @returns The default answer.
   */
  private defaultAnswer(text: string): QueryResult {
    if (text === SQL_SHOW_SERVER_VERSION) {
      return { rows: [{ [SQL_COLUMN_SERVER_VERSION]: FAKE_SERVER_VERSION }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
}
