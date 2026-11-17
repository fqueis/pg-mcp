import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConnectionSourceKind } from '@constants/connection-source-kind.constants.js';
import { CatalogQuery } from '@constants/catalog.constants.js';
import { WritePolicyMode } from '@constants/write-policy.constants.js';

import { SHOP_ENTRY, SHOP_ENV_VAR, SHOP_URL } from '@tests/helpers/constants/connection-fixtures.constants.js';
import { catalogAnswer, readCatalogSql } from '@tests/helpers/utils/catalog-sql.utils.js';
import { FakeElicitor } from '@tests/helpers/fakes/fake-elicitor.provider.js';
import { createServiceHarness } from '@tests/helpers/utils/create-service.utils.js';
import { FAKE_SERVER_VERSION } from '@tests/helpers/constants/fake-pool.constants.js';
import type { ServiceHarness } from '@tests/helpers/interfaces/service-harness.interface.js';

/**
 * Seam: `PgMcpService` through its public methods, over a real registry in a
 * temporary directory, fake pools at the driver boundary, an injected clock, and a
 * fake client for the write confirmation.
 *
 * A test that does not care what the database answers uses the shared `harness`,
 * whose fake pools answer every statement with an empty result. A test that needs
 * the database to answer a specific statement builds its own harness with a script.
 *
 * Out of scope: the MCP transport and tool wiring, and the catalog SQL itself,
 * which the real-PostgreSQL spec covers.
 */
describe('PgMcpService', () => {
  let harness: ServiceHarness;

  beforeEach(async () => {
    harness = await createServiceHarness();
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  describe('listConnections', () => {
    it('lists live connections sorted by id, with the source kind and without any credential', async () => {
      harness.env[SHOP_ENV_VAR] = SHOP_URL;
      await harness.service.useConnection({ databaseUrl: SHOP_URL, id: 'zeta' });
      await harness.service.useConnection({ envVar: SHOP_ENV_VAR, id: 'alpha' });

      const connections = await harness.service.listConnections();

      expect(connections).toEqual([
        {
          id: 'alpha',
          host: 'localhost',
          port: 5432,
          database: 'shop',
          user: 'app',
          sourceKind: ConnectionSourceKind.ENV,
          lastUsedAt: harness.clock.now,
        },
        {
          id: 'zeta',
          host: 'localhost',
          port: 5432,
          database: 'shop',
          user: 'app',
          sourceKind: ConnectionSourceKind.LITERAL,
          lastUsedAt: harness.clock.now,
        },
      ]);
      expect(JSON.stringify(connections)).not.toContain('s3cret');
    });
  });

  describe('forgetConnection', () => {
    it('closes the pool and removes the connection from the registry', async () => {
      await harness.service.useConnection({ databaseUrl: SHOP_URL });

      const forgotten = await harness.service.forgetConnection('localhost-5432-shop');

      expect(forgotten).toBe(true);
      expect(harness.pools[0]?.pool.ended).toBe(true);
      expect(await harness.service.listConnections()).toEqual([]);
    });

    it('reports false for an id that is not registered', async () => {
      expect(await harness.service.forgetConnection('unknown')).toBe(false);
    });
  });

  describe('close', () => {
    it('closes every open pool but keeps the connections registered', async () => {
      await harness.service.useConnection({ databaseUrl: SHOP_URL });

      await harness.service.close();

      expect(harness.pools.every(({ pool }) => pool.ended)).toBe(true);
      expect((await harness.service.listConnections()).map((c) => c.id)).toEqual(['localhost-5432-shop']);
    });
  });

  describe('clearConnections', () => {
    it('closes every pool, empties the registry, and returns how many were removed', async () => {
      await harness.service.useConnection({ databaseUrl: SHOP_URL, id: 'one' });
      await harness.service.useConnection({ databaseUrl: SHOP_URL, id: 'two' });

      const removed = await harness.service.clearConnections();

      expect(removed).toBe(2);
      expect(harness.pools.every(({ pool }) => pool.ended)).toBe(true);
      expect(await harness.service.listConnections()).toEqual([]);
    });
  });

  describe('refreshConnection', () => {
    it('closes the old pool and reconnects with the credential resolved again', async () => {
      harness.env[SHOP_ENV_VAR] = SHOP_URL;
      await harness.service.useConnection({ envVar: SHOP_ENV_VAR });
      const rotatedUrl = 'postgres://app:rotated@localhost:5432/shop';
      harness.env[SHOP_ENV_VAR] = rotatedUrl;

      const result = await harness.service.refreshConnection('localhost-5432-shop');

      expect(harness.pools.map((p) => p.connectionString)).toEqual([SHOP_URL, rotatedUrl]);
      expect(harness.pools[0]?.pool.ended).toBe(true);
      expect(result).toMatchObject({ id: 'localhost-5432-shop', serverVersion: FAKE_SERVER_VERSION });
      expect(JSON.stringify(result)).not.toContain('rotated');
    });

    it('fails clearly for an id that is not registered', async () => {
      await expect(harness.service.refreshConnection('unknown')).rejects.toThrow(/unknown/);
    });
  });

  describe('listSchemas', () => {
    it('lists the user schemas of the database', async () => {
      const sql = await readCatalogSql(CatalogQuery.LIST_SCHEMAS);
      const scripted = await createServiceHarness((text) =>
        text === sql ? catalogAnswer(['public', 'sales']) : undefined,
      );
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      expect(await scripted.service.listSchemas('localhost-5432-shop')).toEqual(['public', 'sales']);
      await scripted.cleanup();
    });
  });

  describe('listTables', () => {
    const tables = [
      { name: 'orders', type: 'table' },
      { name: 'recent_orders', type: 'view' },
    ];

    it('lists tables and views of the public schema by default', async () => {
      const sql = await readCatalogSql(CatalogQuery.LIST_TABLES);
      const seenParams: unknown[][] = [];
      const scripted = await createServiceHarness((text, params) => {
        if (text !== sql) return undefined;
        seenParams.push(params ?? []);
        return catalogAnswer(tables);
      });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const listed = await scripted.service.listTables({ connectionId: 'localhost-5432-shop' });

      expect(listed).toEqual(tables);
      expect(seenParams).toEqual([['public']]);
      await scripted.cleanup();
    });

    it('lists the tables of the schema the caller names', async () => {
      const sql = await readCatalogSql(CatalogQuery.LIST_TABLES);
      const seenParams: unknown[][] = [];
      const scripted = await createServiceHarness((text, params) => {
        if (text !== sql) return undefined;
        seenParams.push(params ?? []);
        return catalogAnswer([]);
      });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      await scripted.service.listTables({ connectionId: 'localhost-5432-shop', schema: 'sales' });

      expect(seenParams).toEqual([['sales']]);
      await scripted.cleanup();
    });
  });

  describe('describeTable', () => {
    const orders = {
      schema: 'public',
      table: 'orders',
      columns: [
        { name: 'id', type: 'integer', nullable: false, default: "nextval('orders_id_seq'::regclass)" },
        { name: 'customer_id', type: 'integer', nullable: true, default: null },
      ],
      primaryKey: ['id'],
      foreignKeys: [
        {
          name: 'orders_customer_fk',
          columns: ['customer_id'],
          referencesSchema: 'public',
          referencesTable: 'customers',
          referencesColumns: ['id'],
        },
      ],
      indexes: [
        { name: 'orders_pkey', definition: 'CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id)' },
      ],
    };

    it('returns the table description with one catalog statement inside one read-only transaction', async () => {
      const sql = await readCatalogSql(CatalogQuery.DESCRIBE_TABLE);
      const seenParams: unknown[][] = [];
      const scripted = await createServiceHarness((text, params) => {
        if (text !== sql) return undefined;
        seenParams.push(params ?? []);
        return catalogAnswer(orders);
      });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const description = await scripted.service.describeTable({
        connectionId: 'localhost-5432-shop',
        table: 'orders',
      });

      expect(description).toEqual(orders);
      expect(seenParams).toEqual([['public', 'orders']]);
      // Skip the version check that useConnection sends while registering; the rest is the transaction under test.
      expect(scripted.pools[0]?.pool.statements.slice(1)).toEqual([
        'BEGIN READ ONLY',
        'SET LOCAL statement_timeout = 15000',
        sql,
        'ROLLBACK',
      ]);
      await scripted.cleanup();
    });

    it('fails clearly when the table does not exist', async () => {
      await harness.service.useConnection({ databaseUrl: SHOP_URL });

      const attempt = harness.service.describeTable({ connectionId: 'localhost-5432-shop', table: 'ghosts' });

      await expect(attempt).rejects.toThrow(/public\.ghosts/);
    });
  });

  describe('execute', () => {
    it('runs the statement in a transaction and commits when writes are allowed', async () => {
      const scripted = await createServiceHarness(
        (text) => (text === 'UPDATE orders SET note = $1' ? { rows: [], rowCount: 3 } : undefined),
        { writeMode: WritePolicyMode.ON },
      );
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const output = await scripted.service.execute({
        connectionId: 'localhost-5432-shop',
        sql: 'UPDATE orders SET note = $1',
        params: ['shipped'],
      });

      expect(output).toEqual({ rowCount: 3, rows: [], truncated: false });
      // Skip the version check that useConnection sends while registering; the rest is the transaction under test.
      expect(scripted.pools[0]?.pool.statements.slice(1)).toEqual([
        'BEGIN',
        'SET LOCAL statement_timeout = 15000',
        'UPDATE orders SET note = $1',
        'COMMIT',
      ]);
      expect(scripted.pools[0]?.pool.outstandingClients).toBe(0);
      await scripted.cleanup();
    });

    it('refuses every write when writes are off, without touching the database', async () => {
      const scripted = await createServiceHarness(undefined, { writeMode: WritePolicyMode.OFF });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const attempt = scripted.service.execute({ connectionId: 'localhost-5432-shop', sql: 'DELETE FROM orders' });

      await expect(attempt).rejects.toThrow(/Writes are disabled/);
      expect(scripted.pools[0]?.pool.statements).not.toContain('DELETE FROM orders');
      await scripted.cleanup();
    });

    it('asks the human and runs the write when they approve', async () => {
      const elicitor = new FakeElicitor(true, true);
      const scripted = await createServiceHarness(undefined, { writeMode: WritePolicyMode.ASK, elicitor });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      await scripted.service.execute({
        connectionId: 'localhost-5432-shop',
        sql: 'DELETE FROM orders WHERE id = $1',
        params: [7],
      });

      expect(scripted.pools[0]?.pool.statements).toContain('DELETE FROM orders WHERE id = $1');
      expect(elicitor.messages).toHaveLength(1);
      expect(elicitor.messages[0]).toContain('localhost-5432-shop');
      expect(elicitor.messages[0]).toContain('app@localhost:5432/shop');
      expect(elicitor.messages[0]).toContain('DELETE FROM orders WHERE id = $1');
      expect(elicitor.messages[0]).toContain('[7]');
      expect(elicitor.messages[0]).not.toContain('s3cret');
      await scripted.cleanup();
    });

    it('does not run the write when the human declines', async () => {
      const scripted = await createServiceHarness(undefined, {
        writeMode: WritePolicyMode.ASK,
        elicitor: new FakeElicitor(true, false),
      });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const attempt = scripted.service.execute({ connectionId: 'localhost-5432-shop', sql: 'DELETE FROM orders' });

      await expect(attempt).rejects.toThrow(/not approved/);
      expect(scripted.pools[0]?.pool.statements).not.toContain('DELETE FROM orders');
      await scripted.cleanup();
    });

    it('still asks the human when the agent claims it already has approval', async () => {
      const elicitor = new FakeElicitor(true, false);
      const scripted = await createServiceHarness(undefined, { writeMode: WritePolicyMode.ASK, elicitor });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const attempt = scripted.service.execute({
        connectionId: 'localhost-5432-shop',
        sql: 'DELETE FROM orders',
        confirmedByUser: true,
      });

      await expect(attempt).rejects.toThrow(/not approved/);
      expect(elicitor.messages).toHaveLength(1);
      await scripted.cleanup();
    });

    it('tells the agent to ask the human in chat when the client cannot ask', async () => {
      const scripted = await createServiceHarness(undefined, {
        writeMode: WritePolicyMode.ASK,
        elicitor: new FakeElicitor(false),
      });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const attempt = scripted.service.execute({ connectionId: 'localhost-5432-shop', sql: 'DELETE FROM orders' });

      await expect(attempt).rejects.toThrow(/confirmedByUser/);
      expect(scripted.pools[0]?.pool.statements).not.toContain('DELETE FROM orders');
      await scripted.cleanup();
    });

    it('runs the write when the client cannot ask but the agent reports explicit approval', async () => {
      const scripted = await createServiceHarness(undefined, {
        writeMode: WritePolicyMode.ASK,
        elicitor: new FakeElicitor(false),
      });
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      await scripted.service.execute({
        connectionId: 'localhost-5432-shop',
        sql: 'DELETE FROM orders',
        confirmedByUser: true,
      });

      expect(scripted.pools[0]?.pool.statements).toContain('DELETE FROM orders');
      await scripted.cleanup();
    });

    it('rolls back, releases the client, and hides secrets when the write fails', async () => {
      const scripted = await createServiceHarness(
        (text) => (text === 'UPDATE orders SET id = 1' ? new Error(`duplicate key via ${SHOP_URL}`) : undefined),
        { writeMode: WritePolicyMode.ON },
      );
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const attempt = scripted.service.execute({
        connectionId: 'localhost-5432-shop',
        sql: 'UPDATE orders SET id = 1',
      });

      await expect(attempt).rejects.toThrow('duplicate key via postgres://app:***@localhost:5432/shop');
      expect(scripted.pools[0]?.pool.statements.at(-1)).toBe('ROLLBACK');
      expect(scripted.pools[0]?.pool.outstandingClients).toBe(0);
      await scripted.cleanup();
    });
  });

  describe('query', () => {
    it('runs the statement inside a read-only transaction with a timeout and rolls it back', async () => {
      const rows = [{ id: 1 }, { id: 2 }];
      const scripted = await createServiceHarness((text) =>
        text === 'SELECT id FROM orders' ? { rows, rowCount: rows.length } : undefined,
      );
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const output = await scripted.service.query({
        connectionId: 'localhost-5432-shop',
        sql: 'SELECT id FROM orders',
      });

      expect(output).toEqual({ rows, rowCount: 2, truncated: false });
      // Skip the version check that useConnection sends while registering; the rest is the transaction under test.
      expect(scripted.pools[0]?.pool.statements.slice(1)).toEqual([
        'BEGIN READ ONLY',
        'SET LOCAL statement_timeout = 15000',
        'SELECT id FROM orders',
        'ROLLBACK',
      ]);
      expect(scripted.pools[0]?.pool.outstandingClients).toBe(0);
      await scripted.cleanup();
    });

    it('truncates to the configured row limit and flags it', async () => {
      const fiveRows = [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }];
      const scripted = await createServiceHarness((text) =>
        text === 'SELECT n FROM t' ? { rows: fiveRows, rowCount: 5 } : undefined,
      );
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const output = await scripted.service.query({ connectionId: 'localhost-5432-shop', sql: 'SELECT n FROM t' });

      expect(output).toEqual({ rows: fiveRows.slice(0, 3), rowCount: 3, truncated: true });
      await scripted.cleanup();
    });

    it('lets the caller ask for fewer rows than the limit but never more', async () => {
      const fiveRows = [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }];
      const scripted = await createServiceHarness((text) =>
        text === 'SELECT n FROM t' ? { rows: fiveRows, rowCount: 5 } : undefined,
      );
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });
      const connectionId = 'localhost-5432-shop';

      const fewer = await scripted.service.query({ connectionId, sql: 'SELECT n FROM t', maxRows: 1 });
      const more = await scripted.service.query({ connectionId, sql: 'SELECT n FROM t', maxRows: 100 });

      expect(fewer.rowCount).toBe(1);
      expect(more.rowCount).toBe(3);
      await scripted.cleanup();
    });

    it('rolls back, releases the client, and hides secrets when the statement fails', async () => {
      const scripted = await createServiceHarness((text) =>
        text === 'DELETE FROM orders' ? new Error(`cannot execute DELETE via ${SHOP_URL}`) : undefined,
      );
      await scripted.service.useConnection({ databaseUrl: SHOP_URL });

      const attempt = scripted.service.query({ connectionId: 'localhost-5432-shop', sql: 'DELETE FROM orders' });

      await expect(attempt).rejects.toThrow('cannot execute DELETE via postgres://app:***@localhost:5432/shop');
      expect(scripted.pools[0]?.pool.statements.at(-1)).toBe('ROLLBACK');
      expect(scripted.pools[0]?.pool.outstandingClients).toBe(0);
      await scripted.cleanup();
    });

    it('fails clearly for a connection id that is not registered', async () => {
      await expect(harness.service.query({ connectionId: 'unknown', sql: 'SELECT 1' })).rejects.toThrow(/unknown/);
    });

    it('reconnects from the registry when the process has no open pool for a registered id', async () => {
      harness.env[SHOP_ENV_VAR] = SHOP_URL;
      await harness.registry.use(SHOP_ENTRY);

      const output = await harness.service.query({ connectionId: SHOP_ENTRY.id, sql: 'SELECT 1' });

      expect(output.rowCount).toBe(0);
      expect(harness.pools.map((p) => p.connectionString)).toEqual([SHOP_URL]);
    });
  });

  describe('useConnection', () => {
    it('registers a connection from a literal URL and reports the target without the password', async () => {
      const result = await harness.service.useConnection({ databaseUrl: SHOP_URL });

      expect(result).toEqual({
        id: 'localhost-5432-shop',
        host: 'localhost',
        port: 5432,
        database: 'shop',
        user: 'app',
        serverVersion: FAKE_SERVER_VERSION,
      });
      expect(JSON.stringify(result)).not.toContain('s3cret');
      expect(harness.pools.map((p) => p.connectionString)).toEqual([SHOP_URL]);
    });

    it('persists the connection so it survives a new registry instance', async () => {
      await harness.service.useConnection({ databaseUrl: SHOP_URL });

      expect(await harness.registry.get('localhost-5432-shop')).toMatchObject({
        host: 'localhost',
        database: 'shop',
        source: { kind: ConnectionSourceKind.LITERAL, databaseUrl: SHOP_URL },
      });
    });

    it('registers under a custom id', async () => {
      const result = await harness.service.useConnection({ databaseUrl: SHOP_URL, id: 'shop-dev' });

      expect(result.id).toBe('shop-dev');
      expect(await harness.registry.get('shop-dev')).toBeDefined();
    });

    it('stores only the variable name for an env source and connects with the resolved URL', async () => {
      harness.env[SHOP_ENV_VAR] = SHOP_URL;

      await harness.service.useConnection({ envVar: SHOP_ENV_VAR });

      const stored = await harness.registry.get('localhost-5432-shop');
      expect(stored?.source).toEqual({ kind: ConnectionSourceKind.ENV, envVar: SHOP_ENV_VAR });
      expect(JSON.stringify(stored)).not.toContain('s3cret');
      expect(harness.pools[0]?.connectionString).toBe(SHOP_URL);
    });

    it.each(['mysql://app:s3cret@localhost/shop', 'not a url with s3cret'])(
      'rejects %j as a connection string without echoing it',
      async (databaseUrl) => {
        const attempt = harness.service.useConnection({ databaseUrl });

        await expect(attempt).rejects.toThrow(/Invalid connection string/);
        await expect(attempt).rejects.not.toThrow(/s3cret/);
      },
    );

    it('asks for a credential source when none is given', async () => {
      await expect(harness.service.useConnection({})).rejects.toThrow(/databaseUrl, envVar, or envFile/);
    });

    it('rejects more than one credential source', async () => {
      await expect(harness.service.useConnection({ databaseUrl: SHOP_URL, envVar: SHOP_ENV_VAR })).rejects.toThrow(
        /exactly one/,
      );
    });

    it('requires envKey together with envFile', async () => {
      await expect(harness.service.useConnection({ envFile: '/work/shop/.env' })).rejects.toThrow(/envKey/);
    });

    it('registers nothing, closes the pool, and hides the password when the database is unreachable', async () => {
      const failing = await createServiceHarness(() => new Error(`connect ECONNREFUSED for ${SHOP_URL}`));

      const attempt = failing.service.useConnection({ databaseUrl: SHOP_URL });

      await expect(attempt).rejects.toThrow('connect ECONNREFUSED for postgres://app:***@localhost:5432/shop');
      expect(await failing.registry.list()).toEqual([]);
      expect(failing.pools[0]?.pool.ended).toBe(true);
      await failing.cleanup();
    });
  });
});
