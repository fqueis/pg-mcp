# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/fqueis/pg-mcp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/fqueis/pg-mcp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fqueis/pg-mcp/releases/tag/v0.1.0
