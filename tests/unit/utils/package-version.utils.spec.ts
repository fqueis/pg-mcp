import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { TEXT_FILE_ENCODING } from '@constants/encoding.constants.js';
import { readPackageVersion } from '@utils/package-version.utils.js';

/**
 * Seam: `readPackageVersion` reports the version the package was published with.
 */
describe('readPackageVersion', () => {
  it('returns the version declared in package.json', async () => {
    // package.json sits three folders above this file: tests/unit/utils.
    const manifest = JSON.parse(
      await readFile(new URL('../../../package.json', import.meta.url), TEXT_FILE_ENCODING),
    ) as { version: string };

    expect(readPackageVersion()).toBe(manifest.version);
  });

  it('returns a semantic version', () => {
    expect(readPackageVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
