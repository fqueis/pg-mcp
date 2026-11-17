import { ErrorMessage } from '@constants/error-messages.constants.js';
import {
  SQL_COLUMN_QUERY_PLAN,
  SQL_COLUMN_SERVER_VERSION,
  SQL_EXPLAIN_ANALYZE_PREFIX,
  SQL_EXPLAIN_PREFIX,
  SQL_SHOW_SERVER_VERSION,
} from '@constants/sql.constants.js';
import type { ConnectionSummary } from '@interfaces/connection-summary.interface.js';
import type { ActiveConnection } from '@interfaces/active-connection.interface.js';
import type { DatabasePool } from '@interfaces/database-pool.interface.js';
import type { DescribeTableInput } from '@interfaces/describe-table-input.interface.js';
import type { ExplainInput } from '@interfaces/explain-input.interface.js';
import type { ExplainOutput } from '@interfaces/explain-output.interface.js';
import type { ExecuteInput } from '@interfaces/execute-input.interface.js';
import type { ExecuteOutput } from '@interfaces/execute-output.interface.js';
import type { ListTablesInput } from '@interfaces/list-tables-input.interface.js';
import type { OpenedConnection } from '@interfaces/opened-connection.interface.js';
import type { PgMcpServiceOptions } from '@interfaces/pg-mcp-service-options.interface.js';
import type { QueryInput } from '@interfaces/query-input.interface.js';
import type { QueryOutput } from '@interfaces/query-output.interface.js';
import type { SchemaSearchResult } from '@interfaces/schema-search-result.interface.js';
import type { SearchSchemaInput } from '@interfaces/search-schema-input.interface.js';
import type { TableDescription } from '@interfaces/table-description.interface.js';
import type { TableInfo } from '@interfaces/table-info.interface.js';
import type { UseConnectionInput } from '@interfaces/use-connection-input.interface.js';
import type { UseConnectionResult } from '@interfaces/use-connection-result.interface.js';
import type { ConnectionSource } from '@app-types/connection-source.type.js';
import type { CatalogRunner } from '@app-types/catalog-runner.type.js';
import { CatalogService } from '@services/catalog.service.js';
import { runInReadOnlyTransaction } from '@utils/read-only.utils.js';
import { redactSecrets } from '@utils/redact.utils.js';
import { resolveConnectionString } from '@utils/resolve.utils.js';
import { toConnectionSource } from '@utils/source.utils.js';
import { runInWriteTransaction } from '@utils/write-transaction.utils.js';
import { deriveConnectionId, parseConnectionString } from '@utils/url.utils.js';

/**
 * Orchestrates connection registration and database access for the MCP tools.
 *
 * Tools stay thin adapters over this class. It owns the pools, never exposes a
 * connection string, and masks credentials in every error it throws.
 */
export class PgMcpService {
  /** Open pools by connection id. A pool lives until its connection is forgotten, refreshed, or cleared. */
  private readonly pools = new Map<string, DatabasePool>();
  /** Reads database structure through the catalog query files. */
  private readonly catalog = new CatalogService();

  constructor(private readonly options: PgMcpServiceOptions) {}

  /**
   * Lists the registered connections whose TTL has not elapsed.
   *
   * @returns Summaries sorted by id; never a credential.
   */
  async listConnections(): Promise<ConnectionSummary[]> {
    const entries = await this.options.registry.list();
    return entries.map(({ id, host, port, database, user, source, lastUsedAt }) => ({
      id,
      host,
      port,
      database,
      user,
      sourceKind: source.kind,
      lastUsedAt,
    }));
  }

  /**
   * Removes one connection from the registry and closes its pool.
   *
   * @param id - Connection id.
   * @returns `true` when the connection was registered.
   */
  async forgetConnection(id: string): Promise<boolean> {
    await this.closePool(id);
    return this.options.registry.forget(id);
  }

  /**
   * Closes every open pool without touching the registry, so the connections
   * stay registered for the next run. Called when the server shuts down.
   *
   * @returns Resolves when every pool has closed.
   */
  async close(): Promise<void> {
    await Promise.all([...this.pools.keys()].map((id) => this.closePool(id)));
  }

  /**
   * Removes every connection from the registry and closes every pool.
   *
   * @returns How many registered connections were removed.
   */
  async clearConnections(): Promise<number> {
    await this.close();
    return this.options.registry.clear();
  }

  /**
   * Registers a connection, verifies it, and keeps its pool open.
   *
   * Nothing is persisted when the database cannot be reached.
   *
   * @param input - Credential source and optional id.
   * @returns The registered target and the server version; never the password.
   * @throws {@link Error} when the source is invalid or the database is unreachable (message is redacted).
   */
  async useConnection(input: UseConnectionInput): Promise<UseConnectionResult> {
    const source = toConnectionSource(input);
    const opened = await this.openConnection(source);
    return this.register(input.id ?? opened.derivedId, source, opened);
  }

  /**
   * Reopens a registered connection, resolving its credential source again so a
   * rotated variable or edited `.env` file takes effect.
   *
   * @param id - Connection id.
   * @returns The refreshed target and the server version; never the password.
   * @throws {@link Error} when the id is not registered, or the database is unreachable (message is redacted).
   */
  async refreshConnection(id: string): Promise<UseConnectionResult> {
    const entry = await this.options.registry.get(id);
    if (!entry) throw new Error(ErrorMessage.connectionNotFound(id));

    const opened = await this.openConnection(entry.source);
    return this.register(id, entry.source, opened);
  }

  /**
   * Runs one statement that changes data, after the write policy allows it.
   *
   * The statement runs in a transaction that is committed on success and rolled
   * back on failure.
   *
   * @param input - Connection id, SQL, parameters, and the agent's confirmation claim.
   * @returns The affected row count and any rows a `RETURNING` clause produced.
   * @throws {@link Error} when the connection is not registered, the policy refuses the write, or the statement fails (message is redacted).
   */
  async execute(input: ExecuteInput): Promise<ExecuteOutput> {
    const { entry, pool } = await this.connectionFor(input.connectionId);
    await this.options.writePolicy.authorize({
      connectionId: entry.id,
      target: { host: entry.host, port: entry.port, database: entry.database, user: entry.user },
      sql: input.sql,
      params: input.params,
      confirmedByUser: input.confirmedByUser,
    });

    try {
      const result = await runInWriteTransaction(pool, input.sql, input.params, this.options.statementTimeoutMs);
      const rows = result.rows.slice(0, this.options.maxRows);
      return { rowCount: result.rowCount, rows, truncated: result.rows.length > this.options.maxRows };
    } catch (error) {
      throw this.redactedError(error);
    }
  }

  /**
   * Returns the execution plan of a statement, inside a read-only transaction.
   *
   * Without `analyze` the statement is only planned, so even a write can be explained safely.
   * With `analyze` it really runs; the read-only transaction still refuses a write.
   *
   * @param input - Connection id, SQL, parameters, and whether to measure.
   * @returns The plan in the JSON shape PostgreSQL reports.
   * @throws {@link Error} when the connection is not registered, the database returns no plan, or the statement fails (message is redacted).
   */
  async explain(input: ExplainInput): Promise<ExplainOutput> {
    const { pool } = await this.connectionFor(input.connectionId);
    const prefix = input.analyze ? SQL_EXPLAIN_ANALYZE_PREFIX : SQL_EXPLAIN_PREFIX;
    try {
      const result = await runInReadOnlyTransaction(
        pool,
        `${prefix}${input.sql}`,
        input.params,
        this.options.statementTimeoutMs,
      );
      const plan = (result.rows[0]?.[SQL_COLUMN_QUERY_PLAN] as Record<string, unknown>[] | undefined)?.[0];
      if (!plan) throw new Error(ErrorMessage.EXPLAIN_RETURNED_NO_PLAN);
      return { plan };
    } catch (error) {
      throw this.redactedError(error);
    }
  }

  /**
   * Runs one statement on a registered connection inside a read-only transaction.
   *
   * @param input - Connection id, SQL, parameters, and optional row limit.
   * @returns The rows, their count, and whether the result was truncated.
   * @throws {@link Error} when the connection is not registered or the statement fails (message is redacted).
   */
  async query(input: QueryInput): Promise<QueryOutput> {
    const { pool } = await this.connectionFor(input.connectionId);
    const limit = Math.min(input.maxRows ?? this.options.maxRows, this.options.maxRows);
    try {
      // One row beyond the limit tells whether the result was cut, without reading the rest of it.
      const result = await runInReadOnlyTransaction(
        pool,
        input.sql,
        input.params,
        this.options.statementTimeoutMs,
        limit + 1,
      );
      const rows = result.rows.slice(0, limit);
      return { rows, rowCount: rows.length, truncated: result.rows.length > limit };
    } catch (error) {
      throw this.redactedError(error);
    }
  }

  /**
   * Lists the user schemas of a registered connection's database.
   *
   * @param connectionId - Id of a registered connection.
   * @returns Schema names in alphabetical order.
   * @throws {@link Error} when the connection is not registered or the catalog read fails (message is redacted).
   */
  async listSchemas(connectionId: string): Promise<string[]> {
    return this.catalog.listSchemas(await this.catalogRunner(connectionId));
  }

  /**
   * Lists the tables and views of one schema of a registered connection.
   *
   * @param input - Connection id and optional schema.
   * @returns Tables and views in alphabetical order.
   * @throws {@link Error} when the connection is not registered or the catalog read fails (message is redacted).
   */
  async listTables(input: ListTablesInput): Promise<TableInfo[]> {
    return this.catalog.listTables(await this.catalogRunner(input.connectionId), input.schema);
  }

  /**
   * Describes one table of a registered connection: columns, primary key, foreign keys, and indexes.
   *
   * @param input - Connection id, table, and optional schema.
   * @returns The table structure.
   * @throws {@link Error} when the connection is not registered, the table does not exist, or the catalog read fails (message is redacted).
   */
  async describeTable(input: DescribeTableInput): Promise<TableDescription> {
    return this.catalog.describeTable(await this.catalogRunner(input.connectionId), input.table, input.schema);
  }

  /**
   * Finds the tables and columns of a registered connection's database whose name contains a term.
   *
   * @param input - Connection id, the term, and an optional schema to restrict to.
   * @returns The matching tables and columns, capped per kind.
   * @throws {@link Error} when the term is blank, the connection is not registered, or the catalog read fails (message is redacted).
   */
  async searchSchema(input: SearchSchemaInput): Promise<SchemaSearchResult> {
    const term = input.term.trim();
    if (!term) throw new Error(ErrorMessage.EMPTY_SEARCH_TERM);
    return this.catalog.searchSchema(await this.catalogRunner(input.connectionId), term, input.schema);
  }

  /**
   * Binds a catalog runner to a registered connection: every statement runs in
   * a read-only transaction and its errors are redacted.
   */
  private async catalogRunner(connectionId: string): Promise<CatalogRunner> {
    const { pool } = await this.connectionFor(connectionId);
    return async (sql, params) => {
      try {
        return await runInReadOnlyTransaction(pool, sql, params, this.options.statementTimeoutMs);
      } catch (error) {
        throw this.redactedError(error);
      }
    };
  }

  /**
   * Returns a registered connection with its open pool, reopening the pool from
   * the registry when this process has none yet, and renews the connection's TTL.
   *
   * @param id - Connection id.
   * @returns The renewed entry and its open pool.
   * @throws {@link Error} when the id is not registered.
   */
  private async connectionFor(id: string): Promise<ActiveConnection> {
    const entry = await this.options.registry.touch(id);
    if (!entry) throw new Error(ErrorMessage.connectionNotFound(id));

    const open = this.pools.get(id);
    if (open) return { entry, pool: open };

    const opened = await this.openConnection(entry.source);
    this.pools.set(id, opened.pool);
    return { entry, pool: opened.pool };
  }

  /**
   * Builds a fresh error with credentials masked. The original is not attached
   * as `cause`, because it can embed the connection string.
   */
  private redactedError(error: unknown): Error {
    return new Error(redactSecrets(error instanceof Error ? error.message : String(error)));
  }

  /**
   * Resolves a credential source, opens a pool, and verifies it by asking for the server version.
   *
   * @param source - Where the connection string comes from.
   * @returns The verified pool with its target and server version.
   * @throws {@link Error} when the source cannot be resolved or the database is unreachable (message is redacted). The pool is closed first.
   */
  private async openConnection(source: ConnectionSource): Promise<OpenedConnection> {
    const connectionString = await resolveConnectionString(source, this.options.env);
    const target = parseConnectionString(connectionString);
    const pool = this.options.createPool(connectionString);
    try {
      const result = await pool.query(SQL_SHOW_SERVER_VERSION);
      const serverVersion = String(result.rows[0]?.[SQL_COLUMN_SERVER_VERSION]);
      return { pool, target, derivedId: deriveConnectionId(target), serverVersion };
    } catch (error) {
      await pool.end();

      throw this.redactedError(error);
    }
  }

  /**
   * Replaces any open pool for the id, persists the connection, and keeps the new pool.
   *
   * @param id - Connection id.
   * @param source - Credential source to persist.
   * @param opened - The verified connection.
   * @returns The registered target and the server version; never the password.
   */
  private async register(id: string, source: ConnectionSource, opened: OpenedConnection): Promise<UseConnectionResult> {
    await this.closePool(id);
    await this.options.registry.use({ id, source, ...opened.target });
    this.pools.set(id, opened.pool);
    return { id, ...opened.target, serverVersion: opened.serverVersion };
  }

  /**
   * Closes and forgets the open pool of a connection, when this process has one.
   *
   * @param id - Connection id.
   */
  private async closePool(id: string): Promise<void> {
    const pool = this.pools.get(id);
    this.pools.delete(id);
    await pool?.end();
  }
}
