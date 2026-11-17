import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { TEXT_FILE_ENCODING } from '@constants/encoding.constants.js';
import {
  REGISTRY_FILE_MODE,
  REGISTRY_FILE_VERSION,
  REGISTRY_JSON_INDENT,
  REGISTRY_TEMP_FILE_SUFFIX,
} from '@constants/registry.constants.js';
import type { ConnectionEntry } from '@interfaces/connection-entry.interface.js';
import type { ConnectionRegistryOptions } from '@interfaces/connection-registry-options.interface.js';
import type { RegistryFile } from '@interfaces/registry-file.interface.js';
import type { NewConnectionEntry } from '@app-types/new-connection-entry.type.js';

/**
 * Persistent, machine-wide store of registered database connections.
 *
 * Owns reading and writing the registry file. It does not open database
 * connections and never resolves credentials.
 */
export class ConnectionRegistryService {
  constructor(private readonly options: ConnectionRegistryOptions) {}

  /**
   * Registers a connection, or renews it when the id already exists.
   *
   * @param entry - Connection data; `lastUsedAt` is stamped from the clock.
   * @returns The stored entry.
   */
  async use(entry: NewConnectionEntry): Promise<ConnectionEntry> {
    const stored: ConnectionEntry = { ...entry, lastUsedAt: this.options.now() };
    const connections = await this.load();
    await this.save([...connections.filter((c) => c.id !== entry.id), stored]);
    return stored;
  }

  /**
   * Looks up a connection by id.
   *
   * @param id - Connection id.
   * @returns The entry, or `undefined` when it is not registered.
   */
  async get(id: string): Promise<ConnectionEntry | undefined> {
    return (await this.load()).find((c) => c.id === id);
  }

  /**
   * Lists the connections whose TTL has not elapsed.
   *
   * @returns Live entries sorted by id.
   */
  async list(): Promise<ConnectionEntry[]> {
    return (await this.load()).sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Removes one connection.
   *
   * @param id - Connection id.
   * @returns `true` when the connection existed.
   */
  async forget(id: string): Promise<boolean> {
    const connections = await this.load();
    const remaining = connections.filter((c) => c.id !== id);
    if (remaining.length === connections.length) return false;
    await this.save(remaining);
    return true;
  }

  /**
   * Removes every connection.
   *
   * @returns How many live connections were removed.
   */
  async clear(): Promise<number> {
    const count = (await this.load()).length;
    await this.save([]);
    return count;
  }

  /**
   * Renews the sliding TTL of a connection after it was used.
   *
   * @param id - Connection id.
   * @returns The renewed entry, or `undefined` when it is not registered.
   */
  async touch(id: string): Promise<ConnectionEntry | undefined> {
    const connections = await this.load();
    const existing = connections.find((c) => c.id === id);
    if (!existing) return undefined;
    const renewed: ConnectionEntry = { ...existing, lastUsedAt: this.options.now() };
    await this.save(connections.map((c) => (c.id === id ? renewed : c)));
    return renewed;
  }

  /**
   * Reads the registry file and returns the entries whose TTL has not elapsed.
   * Expired entries are left out of the result and leave the file on the next write.
   *
   * A missing file, invalid JSON, or a file of another shape reads as empty, so a
   * damaged registry never blocks registering a connection.
   *
   * @returns The live entries.
   */
  private async load(): Promise<ConnectionEntry[]> {
    try {
      const file = JSON.parse(await readFile(this.options.filePath, TEXT_FILE_ENCODING)) as RegistryFile;
      const { now, ttlMs } = this.options;
      return file.connections.filter((c) => now() - c.lastUsedAt <= ttlMs);
    } catch {
      return [];
    }
  }

  /**
   * Replaces the whole registry file with the given entries. The content goes to a
   * temporary file readable only by its owner, which then replaces the registry file,
   * so a reader never sees a half-written file.
   *
   * There is no file lock: two writers racing on the same instant can drop one
   * update. Every public method reloads before it writes, which keeps that window short.
   *
   * @param connections - Every entry to keep; entries not listed are removed.
   * @throws {@link Error} when the directory or the file cannot be written.
   */
  private async save(connections: ConnectionEntry[]): Promise<void> {
    const file: RegistryFile = { version: REGISTRY_FILE_VERSION, connections };
    await mkdir(path.dirname(this.options.filePath), { recursive: true });
    const tempPath = `${this.options.filePath}.${process.pid}.${REGISTRY_TEMP_FILE_SUFFIX}`;
    await writeFile(tempPath, JSON.stringify(file, null, REGISTRY_JSON_INDENT), {
      encoding: TEXT_FILE_ENCODING,
      mode: REGISTRY_FILE_MODE,
    });
    await rename(tempPath, this.options.filePath);
  }
}
