import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POOL_QUERY_MODE_EXTENDED } from '@constants/pool.constants.js';
import { createPgPool } from '@providers/pool.provider.js';

const { clientQuery, clientRelease } = vi.hoisted(() => ({ clientQuery: vi.fn(), clientRelease: vi.fn() }));

vi.mock('pg', () => ({
  Pool: class {
    on = vi.fn();
    query = vi.fn();
    end = vi.fn();
    connect = vi.fn().mockResolvedValue({ query: clientQuery, release: clientRelease });
  },
}));

/**
 * Seam: the pool provider against a stubbed driver.
 *
 * Behaviors verified:
 * 1. A checked-out connection sends every statement in the driver's extended mode, so the
 *    server refuses a text that holds more than one statement.
 * 2. The parameters travel with the statement.
 * 3. Releasing the wrapper releases the driver connection.
 *
 * Out of scope: the server's refusal itself, covered by the integration spec.
 */
describe('createPgPool', () => {
  beforeEach(() => {
    clientQuery.mockReset();
    clientRelease.mockReset();
  });

  it('sends each statement of a checked-out connection in extended mode', async () => {
    const client = await createPgPool('postgres://localhost/db').connect();

    await client.query('SELECT $1', [1]);

    expect(clientQuery).toHaveBeenCalledWith({ text: 'SELECT $1', values: [1], queryMode: POOL_QUERY_MODE_EXTENDED });
  });

  it('uses extended mode even when the statement has no parameters', async () => {
    const client = await createPgPool('postgres://localhost/db').connect();

    await client.query('SELECT 1; COMMIT');

    expect(clientQuery).toHaveBeenCalledWith(expect.objectContaining({ queryMode: POOL_QUERY_MODE_EXTENDED }));
  });

  it('releases the driver connection when the wrapper is released', async () => {
    const client = await createPgPool('postgres://localhost/db').connect();

    client.release();

    expect(clientRelease).toHaveBeenCalledTimes(1);
  });
});
