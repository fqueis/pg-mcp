/** Schema version written to, and expected in, the registry file. */
export const REGISTRY_FILE_VERSION = 1;

/** Permission bits of the registry file: readable and writable by its owner only. */
export const REGISTRY_FILE_MODE = 0o600;

/** Suffix of the temporary file written before it atomically replaces the registry file. */
export const REGISTRY_TEMP_FILE_SUFFIX = 'tmp';

/** Spaces used to indent the registry JSON so it stays readable and diffable. */
export const REGISTRY_JSON_INDENT = 2;
