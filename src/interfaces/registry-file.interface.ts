import type { REGISTRY_FILE_VERSION } from '@constants/registry.constants.js';
import type { ConnectionEntry } from '@interfaces/connection-entry.interface.js';

/**
 * On-disk shape of the registry JSON file.
 */
export interface RegistryFile {
  /** Schema version of the file; bump `REGISTRY_FILE_VERSION` when the shape changes. */
  version: typeof REGISTRY_FILE_VERSION;
  /** Registered connections, including entries whose TTL may have elapsed. */
  connections: ConnectionEntry[];
}
