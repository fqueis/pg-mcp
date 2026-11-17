import { cpSync } from 'node:fs';

import { SQL_OUTPUT_DIRECTORY, SQL_SOURCE_DIRECTORY } from './constants/build.constants.js';

/**
 * Copies the catalog query files next to the compiled code. `tsc` only emits
 * `.js`, so without this step the published package would lack the SQL. It uses
 * Node's own file API, so it works the same on every operating system.
 */
function copySql(): void {
  cpSync(SQL_SOURCE_DIRECTORY, SQL_OUTPUT_DIRECTORY, { recursive: true });
}

copySql();
