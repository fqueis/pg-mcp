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
 * 2. Table descriptions: columns with types and defaults, composite primary and
 *    foreign keys, indexes, and the error for a table that does not exist.
 * 3. A parameterized read returns rows.
 * 4. PostgreSQL itself refuses a write sent through `query`.
 * 5. A write commits when writes are allowed and is refused, leaving the data
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
      { name: 'id', type: 'integer', nullable: false, default: `nextval('${schema}.orders_id_seq'::regclass)` },
      { name: 'customer_id', type: 'integer', nullable: true, default: null },
      { name: 'total', type: 'numeric(10,2)', nullable: false, default: '0' },
      { name: 'note', type: 'character varying(40)', nullable: true, default: null },
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
