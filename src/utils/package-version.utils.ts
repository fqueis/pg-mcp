import { createRequire } from 'node:module';

import { PACKAGE_JSON_RELATIVE_PATH } from '@constants/server.constants.js';

/**
 * Reads the package version from `package.json`, so the version the server
 * announces always matches the published one.
 *
 * @returns The semantic version string.
 */
export function readPackageVersion(): string {
  const require = createRequire(import.meta.url);
  return (require(PACKAGE_JSON_RELATIVE_PATH) as { version: string }).version;
}
