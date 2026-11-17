import { SQL_COLUMN_SERVER_VERSION, SQL_SHOW_SERVER_VERSION } from '@constants/sql.constants.js';
import type { DatabaseClient } from '@interfaces/database-client.interface.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';
import type { QueryResult } from '@interfaces/query-result.interface.js';

import { FAKE_SERVER_VERSION } from '@tests/helpers/constants/fake-pool.constants.js';
import type { FakeHandler } from '@tests/helpers/types/fake-handler.type.js';

/**
 * In-memory stand-in for the driver pool. It records every statement so tests
 * can assert on what reached the database, and answers through a scripted handler.
 */
export class FakePool implements DatabasePool {
  /** Every statement received, in order, from the pool and from checked-out clients. */
  readonly statements: string[] = [];
  /** Whether `end()` was called. */
  ended = false;
  /** Number of clients checked out and not yet released. */
  outstandingClients = 0;

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
   *
   * @param text - SQL text.
   * @param params - Positional parameters.
   * @returns The answer, or a rejection when the script answers with an error.
   */
  private answer(text: string, params?: unknown[]): Promise<QueryResult> {
    this.statements.push(text);
    const answer = this.handler?.(text, params) ?? this.defaultAnswer(text);
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
