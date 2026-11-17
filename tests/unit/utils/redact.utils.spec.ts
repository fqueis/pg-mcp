import { describe, expect, it } from 'vitest';

import { redactSecrets } from '@utils/redact.utils.js';

/**
 * Seam: `redactSecrets`, the only way a credential is kept out of tool results and errors.
 */
describe('redactSecrets', () => {
  it('masks the password of a connection string', () => {
    expect(redactSecrets('connect failed for postgres://app:s3cret@db.local:5432/shop')).toBe(
      'connect failed for postgres://app:***@db.local:5432/shop',
    );
  });

  it('masks known secrets that appear outside a URL', () => {
    expect(redactSecrets('bad option password=s3cret in dsn', ['s3cret'])).toBe('bad option password=*** in dsn');
  });
});
