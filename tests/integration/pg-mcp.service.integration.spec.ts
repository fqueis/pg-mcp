import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TEXT_FILE_ENCODING } from '@constants/encoding.constants.js';
import { WritePolicyMode } from '@constants/write-policy.constants.js';
import type { WritePolicyModeType } from '@constants/write-policy.constants.js';
import { ConnectionRegistryService } from '@services/connection-registry.service.js';
import { PgMcpService } from '@services/pg-mcp.service.js';
import { WritePolicyService } from '@services/write-policy.service.js';
import { createPgPool } from '@providers/pool.provider.js';
import { FakeElicitor } from '@tests/helpers/fakes/fake-elicitor.provider.js';

import { ONE_DAY_MS } from '@tests/helpers/constants/connection-fixtures.constants.js';
import {
  INTEGRATION_SCHEMA_PREFIX,
  SHOP_SCHEMA_FIXTURE,
  TEST_DATABASE_URL_ENV,
} from '@tests/helpers/constants/integration.constants.js';

/**
 * Seam: the service against a real PostgreSQL. Runs only when `PG_MCP_TEST_URL`
 * points at a disposable database; every object lives in a throwaway schema.
 *
 * Behaviors verified against the real server:
 * 1. Registration, and listing of schemas, tables, and views.
 * 2. Table descriptions: columns with types, defaults and enum values, composite
 *    primary and foreign keys, indexes, the estimated row count, and the error
 *    for a table that does not exist.
 * 3. Name search over tables and columns: case-insensitive, literal `%` and `_`,
 *    and restricted to one schema.
 * 4. A parameterized read returns rows, and a huge result is cut at the row
 *    limit by the server instead of being loaded whole.
 * 5. Statements that cannot be a cursor (`SHOW`) still run, and invalid SQL
 *    reports the server's own error.
 * 6. PostgreSQL itself refuses a write sent through `query`.
 * 7. Execution plans: a statement, even a write, is only planned unless analyze
 *    is requested, and analyzing a write is refused by the read-only transaction.
 * 8. A write commits when writes are allowed and is refused, leaving the data
 *    untouched, when they are off.
 *
 * Out of scope: the MCP transport and tool wiring.
 */
describe.skipIf(!process.env[TEST_DATABASE_URL_ENV])('PgMcpService against a real PostgreSQL', () => {
  const databaseUrl = process.env[TEST_DATABASE_URL_ENV] as string;
  const schema = `${INTEGRATION_SCHEMA_PREFIX}${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  let dir: string;
  let service: PgMcpService;
  let readOnlyService: PgMcpService;
  let connectionId: string;

  /**
   * Builds a service over a registry file in the temporary directory.
   *
   * @param mode - Write policy mode of the service.
   * @returns A service that opens real pools.
   */
  const createService = (mode: WritePolicyModeType): PgMcpService =>
    new PgMcpService({
      registry: new ConnectionRegistryService({
        filePath: path.join(dir, `${mode}-connections.json`),
        ttlMs: ONE_DAY_MS,
        now: () => Date.now(),
      }),
      createPool: createPgPool,
      maxRows: 100,
      statementTimeoutMs: 5000,
      writePolicy: new WritePolicyService({ mode, elicitor: new FakeElicitor(false) }),
    });

  beforeAll(async () => {
    const admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    try {
      await admin.query(`CREATE SCHEMA ${schema}`);
      await admin.query(`SET search_path TO ${schema}`);
      await admin.query(await readFile(SHOP_SCHEMA_FIXTURE, TEXT_FILE_ENCODING));
    } finally {
      await admin.end();
    }

    dir = await mkdtemp(path.join(tmpdir(), 'pg-mcp-integration-'));
    service = createService(WritePolicyMode.ON);
    readOnlyService = createService(WritePolicyMode.OFF);
    await readOnlyService.useConnection({ databaseUrl });
    connectionId = (await service.useConnection({ databaseUrl })).id;
  });

  afterAll(async () => {
    await service.clearConnections();
    await readOnlyService.clearConnections();
    const admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    try {
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    } finally {
      await admin.end();
    }
    await rm(dir, { recursive: true, force: true });
  });

  it('lists the connection it registered', async () => {
    const connections = await service.listConnections();

    expect(connections.map((c) => c.id)).toContain(connectionId);
  });

  it('lists the throwaway schema among the user schemas', async () => {
    expect(await service.listSchemas(connectionId)).toContain(schema);
  });

  it('lists tables and views of the schema with their kinds', async () => {
    expect(await service.listTables({ connectionId, schema })).toEqual([
      { name: 'customers', type: 'table' },
      { name: 'order_items', type: 'table' },
      { name: 'orders', type: 'table' },
      { name: 'recent_orders', type: 'view' },
    ]);
  });

  it('describes columns, primary key, foreign keys, and indexes', async () => {
    const description = await service.describeTable({ connectionId, schema, table: 'orders' });

    expect(description.columns).toEqual([
      // The schema is not on the MCP session's search_path, so PostgreSQL qualifies the sequence name.
      {
        name: 'id',
        type: 'integer',
        nullable: false,
        default: `nextval('${schema}.orders_id_seq'::regclass)`,
        enumValues: null,
      },
      { name: 'customer_id', type: 'integer', nullable: true, default: null, enumValues: null },
      { name: 'total', type: 'numeric(10,2)', nullable: false, default: '0', enumValues: null },
      { name: 'note', type: 'character varying(40)', nullable: true, default: null, enumValues: null },
      {
        name: 'status',
        type: `${schema}.order_status`,
        nullable: false,
        default: `'pending'::${schema}.order_status`,
        enumValues: ['pending', 'shipped', 'delivered'],
      },
    ]);
    expect(description.primaryKey).toEqual(['id']);
    expect(description.foreignKeys).toEqual([
      {
        name: 'orders_customer_id_fkey',
        columns: ['customer_id'],
        referencesSchema: schema,
        referencesTable: 'customers',
        referencesColumns: ['id'],
      },
    ]);
    expect(description.indexes.map((i) => i.name)).toEqual(['orders_customer_idx', 'orders_pkey']);
  });

  it('reports the estimated row count only for a table that has statistics', async () => {
    const analyzed = await service.describeTable({ connectionId, schema, table: 'customers' });
    const neverAnalyzed = await service.describeTable({ connectionId, schema, table: 'orders' });
    const view = await service.describeTable({ connectionId, schema, table: 'recent_orders' });

    // customers was analyzed with two rows; orders never was, so PostgreSQL has no estimate; a view has none.
    expect(analyzed.estimatedRows).toBe(2);
    expect(neverAnalyzed.estimatedRows).toBeNull();
    expect(view.estimatedRows).toBeNull();
  });

  it('keeps composite primary and foreign keys in column order', async () => {
    const description = await service.describeTable({ connectionId, schema, table: 'order_items' });

    expect(description.primaryKey).toEqual(['order_id', 'line']);
    expect(description.foreignKeys).toHaveLength(1);
  });

  it('fails clearly for a table that does not exist', async () => {
    const attempt = service.describeTable({ connectionId, schema, table: 'ghosts' });

    await expect(attempt).rejects.toThrow(`${schema}.ghosts`);
  });

  it('runs a parameterized read and returns the rows', async () => {
    const output = await service.query({
      connectionId,
      sql: `SELECT email FROM ${schema}.customers WHERE email LIKE $1 ORDER BY email`,
      params: ['%@example.com'],
    });

    expect(output).toEqual({
      rows: [{ email: 'ada@example.com' }, { email: 'grace@example.com' }],
      rowCount: 2,
      truncated: false,
    });
  });

  it('finds tables and columns by part of their name, ignoring case', async () => {
    const found = await service.searchSchema({ connectionId, schema, term: 'ORDER' });

    // Ordering depends on the database collation, so the names are compared sorted.
    expect(found.tables.map((table) => table.name).sort()).toEqual(['order_items', 'orders', 'recent_orders']);
    expect(found.tables.every((table) => table.schema === schema)).toBe(true);
    expect(found.columns).toEqual([{ schema, table: 'order_items', column: 'order_id', type: 'integer' }]);
  });

  it('matches the characters % and _ of the term literally', async () => {
    const underscore = await service.searchSchema({ connectionId, schema, term: 'order_' });
    const percent = await service.searchSchema({ connectionId, schema, term: '%' });

    expect(underscore.tables.map((table) => table.name)).toEqual(['order_items']);
    expect(percent).toEqual({ tables: [], columns: [] });
  });

  it('finds a column and reports the view kind of a relation', async () => {
    const column = await service.searchSchema({ connectionId, schema, term: 'email' });
    const view = await service.searchSchema({ connectionId, schema, term: 'recent' });

    expect(column.columns).toEqual([{ schema, table: 'customers', column: 'email', type: 'text' }]);
    expect(view.tables).toEqual([{ schema, name: 'recent_orders', type: 'view' }]);
  });

  it('searches only the schema it is restricted to', async () => {
    const found = await service.searchSchema({ connectionId, schema: 'schema_that_does_not_exist', term: 'order' });

    expect(found).toEqual({ tables: [], columns: [] });
  });

  it('returns only the row limit of a result with millions of rows', async () => {
    // The service limit is 100. A cursor makes the server hand over 101 rows instead of five million.
    const output = await service.query({
      connectionId,
      sql: 'SELECT g FROM generate_series(1, 5000000) AS g',
    });

    expect(output.rowCount).toBe(100);
    expect(output.truncated).toBe(true);
  });

  it('runs a statement that cannot be a cursor, such as SHOW', async () => {
    const output = await service.query({ connectionId, sql: 'SHOW search_path' });

    expect(output.rowCount).toBe(1);
    expect(output.truncated).toBe(false);
  });

  it('reports the server error of an invalid statement', async () => {
    const attempt = service.query({ connectionId, sql: 'SELEC 1' });

    await expect(attempt).rejects.toThrow(/syntax error at or near "SELEC"/);
  });

  it('explains a statement without running it', async () => {
    const { plan } = await service.explain({ connectionId, sql: `SELECT * FROM ${schema}.customers` });

    expect(plan.Plan).toMatchObject({ 'Node Type': 'Seq Scan', 'Relation Name': 'customers' });
    expect(plan).not.toHaveProperty('Execution Time');
  });

  it('measures the real execution when analyze is requested', async () => {
    const { plan } = await service.explain({
      connectionId,
      sql: `SELECT * FROM ${schema}.customers`,
      analyze: true,
    });

    expect(typeof plan['Execution Time']).toBe('number');
  });

  it('explains a write without running it', async () => {
    const before = await service.query({ connectionId, sql: `SELECT count(*)::int AS total FROM ${schema}.customers` });

    const { plan } = await service.explain({ connectionId, sql: `DELETE FROM ${schema}.customers` });

    const after = await service.query({ connectionId, sql: `SELECT count(*)::int AS total FROM ${schema}.customers` });
    expect(plan.Plan).toMatchObject({ 'Node Type': 'ModifyTable' });
    expect(after.rows).toEqual(before.rows);
  });

  it('refuses to analyze a write because the transaction is read-only', async () => {
    const attempt = service.explain({ connectionId, sql: `DELETE FROM ${schema}.customers`, analyze: true });

    await expect(attempt).rejects.toThrow(/read-only transaction/);
  });

  it('refuses a write because the transaction is read-only', async () => {
    const attempt = service.query({ connectionId, sql: `DELETE FROM ${schema}.customers` });

    await expect(attempt).rejects.toThrow(/read-only transaction/);
  });

  it('commits a write when writes are allowed, and the change is visible afterwards', async () => {
    const output = await service.execute({
      connectionId,
      sql: `UPDATE ${schema}.customers SET email = $1 WHERE email = $2`,
      params: ['ada@lovelace.dev', 'ada@example.com'],
    });

    const after = await service.query({
      connectionId,
      sql: `SELECT email FROM ${schema}.customers WHERE email = $1`,
      params: ['ada@lovelace.dev'],
    });
    expect(output.rowCount).toBe(1);
    expect(after.rowCount).toBe(1);
  });

  it('refuses a write when writes are off, leaving the data untouched', async () => {
    const attempt = readOnlyService.execute({
      connectionId,
      sql: `DELETE FROM ${schema}.customers`,
    });

    await expect(attempt).rejects.toThrow(/Writes are disabled/);
    const remaining = await service.query({
      connectionId,
      sql: `SELECT count(*)::int AS total FROM ${schema}.customers`,
    });
    expect(remaining.rows).toEqual([{ total: 2 }]);
  });
});
