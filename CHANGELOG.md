# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-11-23

Security fixes after an external scan of 0.2.0 reported vulnerable dependencies. Checking the report against the code also found that `query` and `explain` could be made to write.

### Added

- Behavior hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) on all twelve tools, always as explicit booleans, so a client can tell a read from a delete without parsing the description. Only `execute` is a destructive write that is not safe to repeat; `forget_connection` and `clear_connections` are destructive but idempotent
- `pnpm audit --prod --audit-level=high` in PR Checks, so a known high advisory in a runtime dependency blocks the merge
- Dependabot for npm and GitHub Actions, weekly
- `SECURITY.md` with the private reporting channel and what the server promises
- Integration cases that try to leave the read-only transaction through `query`, `explain`, and `execute`, and a unit spec for the pool provider

### Changed

- Every tool now runs exactly one statement per call. A SQL text that holds several statements is refused by PostgreSQL with `cannot insert multiple commands into a prepared statement`. This also applies to `execute`, so the SQL the human approves is the whole text that runs; send a script as one call per statement
- `@modelcontextprotocol/sdk` 1.29.0 to 1.32.2 and `zod` 4.4.3 to 4.6.7
- README and ARCHITECT no longer say a huge result is never loaded into memory, or that secrets never leave the process: a literal `databaseUrl` is stored in the registry file as given

### Security

- `query` and `explain` could write despite the read-only transaction. SQL without parameters was sent as one simple query, which runs every statement in the text, so `SELECT 1; COMMIT; CREATE TABLE t (id int)` ended the `READ ONLY` transaction with the `COMMIT` and ran the rest with write access. Connections now use the driver's `extended` query mode, which accepts one statement per call. Reproduced against PostgreSQL 16 before the fix. If you ran 0.2.0 or 0.1.0 with a database role that can write, use a read-only role and review what agents ran
- Updating `@modelcontextprotocol/sdk` and `zod` fixes seven published advisories, five high and two moderate. Six are in the SDK and concern its HTTP transport, OAuth client, and bearer authentication, none of which this server uses, since it only speaks stdio. The seventh is in `zod`: validating a very large input could exhaust memory
- One moderate advisory remains, in `@hono/node-server`, which the SDK pulls in for its HTTP transport. This server never loads it, and the fix needs a new major version of that package, so it waits for the SDK to update it

## [0.2.0] - 2026-11-16

Two new tools for exploring and tuning, richer table descriptions, and a fix that keeps large query results out of memory.

### Added

- Tool `explain`: execution plan of a statement as JSON. Without `analyze` the statement is only planned, so even an `INSERT`, `UPDATE`, or `DELETE` can be explained safely; with `analyze` it runs and the plan carries measured times, and the transaction stays read-only
- Tool `search_schema`: finds tables and columns whose name contains a term, case-insensitively, across every user schema or one schema. `%` and `_` in the term match themselves, and matches are capped per kind
- `describe_table` returns `estimatedRows` for a table with statistics (`null` for a view or a table never analyzed) and `enumValues` for enum columns (`null` otherwise)
- Integration spec cases for the bounded row fetch, `explain`, `search_schema`, and the new `describe_table` fields

### Fixed

- `query` no longer loads the whole result before applying the row limit. The cap was applied after the rows had already been read, so a `SELECT *` over millions of rows finished inside the statement timeout and used hundreds of megabytes. Rows are now read through a server-side cursor, so the server hands over at most one row beyond the limit
- Statements that cannot be read through a cursor (`SHOW`, `EXPLAIN`, writes, invalid SQL) run directly instead of first provoking an error in the database log. A statement the server still refuses as a cursor, such as a data-modifying `WITH`, runs directly in a fresh transaction and reports its own result or error

## [0.1.0] - 2026-11-16

Initial release: a global PostgreSQL MCP server where agents register connections on demand.

### Added

- Connection tools `use_connection`, `list_connections`, `forget_connection`, `clear_connections`, `refresh_connection`
- Credentials by `databaseUrl`, `envVar`, or `envFile` with `envKey`; reference sources keep the password out of the conversation and off disk
- Schema tools `list_schemas`, `list_tables`, `describe_table`, each backed by one catalog query in `src/sql` that returns a ready JSON document
- Tool `query`: read-only transaction enforced by PostgreSQL, statement timeout, and row cap with a `truncated` flag
- Tool `execute` with a write policy (`PG_MCP_WRITES`: `off`, `ask`, `on`); `ask` uses MCP elicitation to show the connection, SQL, and parameters to the human, with a `confirmedByUser` fallback for clients that cannot ask
- Env `PG_MCP_REGISTRY_PATH`, `PG_MCP_REGISTRY_TTL_MS` (default 7 days), `PG_MCP_WRITES`, `PG_MCP_ENABLE_WRITES`, `PG_MCP_MAX_ROWS` (default `500`), `PG_MCP_STATEMENT_TIMEOUT_MS` (default `15000`)
- Registry in `~/.pg-mcp/connections.json` with sliding TTL, atomic writes, and owner-only permissions, shared by several sessions (reloaded before every change, no file lock)
- Password masking in every tool result and error
- Integration spec against a real PostgreSQL (`PG_MCP_TEST_URL`), run in PR Checks with a service container
- npm publish via Trusted Publishing (OIDC) and `npx -y @fqueis/pg-mcp` install path

[Unreleased]: https://github.com/fqueis/pg-mcp/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/fqueis/pg-mcp/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/fqueis/pg-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fqueis/pg-mcp/releases/tag/v0.1.0
