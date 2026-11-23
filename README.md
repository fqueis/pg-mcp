# PostgreSQL MCP

**Global** MCP server for PostgreSQL. Install it once, and agents register database connections on demand with `use_connection`, so you never need a `.mcp` entry (or a `DATABASE_URL`) per project. Queries run in **read-only** transactions by default; writes are refused, confirmed by the human, or allowed, depending on a setting.

[![npm](https://img.shields.io/npm/v/@fqueis/pg-mcp.svg)](https://www.npmjs.com/package/@fqueis/pg-mcp)
[![PR Checks](https://github.com/fqueis/pg-mcp/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/fqueis/pg-mcp/actions/workflows/pr-checks.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

---

## What it does

Most PostgreSQL MCP servers read one connection string from the environment, which forces a separate MCP configuration for every project. PG MCP is configured **once, globally**. The agent decides which database it needs, registers it, and queries it by id.

Built with [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) and [`pg`](https://www.npmjs.com/package/pg), it provides:

- **On-demand connections**: call `use_connection` with a database URL, or point at an environment variable or a `.env` file so the password never appears in the conversation
- **Schema exploration**: schemas, tables, a search by name across the whole database, and a full table description (columns, primary key, foreign keys, indexes, enum values, estimated row count), each from one catalog query
- **Read-only by default**: `query` runs inside a `READ ONLY` transaction enforced by the server, with a statement timeout and a row cap that the server applies, so a huge `SELECT` is not loaded into memory
- **Execution plans**: `explain` shows how PostgreSQL would run a statement, even a write, without running it
- **Controlled writes**: `execute` is refused, asks the human through MCP elicitation, or runs directly, depending on `PG_MCP_WRITES`
- **No secrets in output**: passwords are masked in every result and error, and are not written to disk when you use an environment variable or a `.env` file

---

## Requirements

- Node.js >= 18
- A reachable PostgreSQL server. The catalog queries use only features available since PostgreSQL 9.5 and are tested against PostgreSQL 16
- [pnpm](https://pnpm.io/): only if you develop or contribute to this repo

---

## Usage with an MCP client

Register the server in your MCP client's config (stdio). Shape varies slightly by client; the examples below use a common `mcpServers` layout.

**Recommended (npm):**

```json
{
  "mcpServers": {
    "pg-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@fqueis/pg-mcp"]
    }
  }
}
```

With Claude Code you can register it once for every project:

```bash
claude mcp add -s user pg-mcp -- npx -y @fqueis/pg-mcp
```

**Optional: allow writes without asking** (see [Write policy](#write-policy)):

```json
{
  "mcpServers": {
    "pg-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@fqueis/pg-mcp"],
      "env": {
        "PG_MCP_ENABLE_WRITES": "1"
      }
    }
  }
}
```

---

## Local development / contributors

```bash
cd /path/to/pg-mcp
pnpm install
pnpm build
pnpm test
```

**Built JS:**

```json
{
  "mcpServers": {
    "pg-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/pg-mcp/dist/index.js"]
    }
  }
}
```

**Dev (TypeScript via tsx):**

```json
{
  "mcpServers": {
    "pg-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "/path/to/pg-mcp/src/index.ts"]
    }
  }
}
```

**Integration tests** run against a real PostgreSQL and are skipped unless `PG_MCP_TEST_URL` is set. Use a disposable database; the spec creates and drops its own schema:

```bash
docker run --rm -d --name pg-mcp-test -e POSTGRES_PASSWORD=pgmcp -p 55432:5432 postgres:16-alpine
PG_MCP_TEST_URL=postgres://postgres:pgmcp@localhost:55432/postgres pnpm test
```

---

## Typical agent flow

1. `use_connection` with `envFile` + `envKey` (or `envVar`, or `databaseUrl`) and an optional `id`
2. `list_schemas` / `list_tables` / `describe_table` to learn the structure, or `search_schema` to find where a table or column lives
3. `query` to read data (read-only, parameterized with `$1`, `$2` and `params`), and `explain` to check the plan of a heavy statement first
4. `execute` to change data, subject to the [write policy](#write-policy)
5. `forget_connection` or `clear_connections` to drop registrations; `refresh_connection` to reopen a connection after the password or the `.env` file changed

If no credential source is given, the tool returns a clear error so the agent can ask the user. Registered connections are shared by every project and every agent session on the machine, and expire after a period of disuse (see [Optional env](#optional-env)).

---

## Tools

| Tool                 | Purpose                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `use_connection`     | Register or renew a connection and verify it (`databaseUrl`, `envVar`, `envFile`) |
| `list_connections`   | List non-expired connections (never a password)                                  |
| `forget_connection`  | Remove one connection and close its pool                                         |
| `clear_connections`  | Remove every connection and close every pool                                     |
| `refresh_connection` | Reopen a connection, resolving its credential source again                       |
| `list_schemas`       | User schemas of the database                                                     |
| `list_tables`        | Tables and views of one schema (default `public`)                                |
| `describe_table`     | Columns (with enum values), primary key, foreign keys, indexes, estimated rows   |
| `search_schema`      | Find tables and columns whose name contains a term (case-insensitive)            |
| `query`              | Run one statement in a read-only transaction, reading at most the row limit      |
| `explain`            | Execution plan of a statement as JSON; planned only, unless `analyze` is set     |
| `execute`            | Run one statement that changes data, subject to the write policy                 |

---

## Write policy

`PG_MCP_WRITES` controls `execute`. `PG_MCP_ENABLE_WRITES=1` is a shortcut for `on`.

| Mode            | Behavior                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `off`           | Every write is refused.                                                                                                   |
| `ask` (default) | The human is asked before each write. The question shows the connection, the exact SQL, and the parameters.               |
| `on`            | Writes run without asking.                                                                                                |

In `ask` mode the server uses [MCP elicitation](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation): the client shows a form with an approval checkbox. Declining, cancelling, or any failure to reach the human counts as "no".

If the client does not support elicitation, `execute` refuses and tells the agent to show the human the connection and the exact SQL, get an explicit yes in chat, and repeat the call with `confirmedByUser: true`. This fallback is a **soft guard**, because the agent controls that flag. When the client can ask, the flag never bypasses the question.

Reads never need approval. `query` cannot write: the server rejects any change inside a read-only transaction, however the SQL is phrased. Every tool runs exactly one statement per call, so a text such as `SELECT 1; COMMIT; DROP TABLE t` is refused whole instead of leaving the read-only transaction; the SQL you approve for `execute` is the whole text that runs.

---

## Credentials and security

| Source                       | What is stored in the registry file          | Password in the conversation |
| ---------------------------- | -------------------------------------------- | ---------------------------- |
| `envVar`                     | The variable name only                       | No                           |
| `envFile` + `envKey`         | The file path and key only                   | No                           |
| `databaseUrl` (literal)      | The full URL, in a file readable only by you | Yes                          |

Prefer `envVar` or `envFile` so the password never appears in agent transcripts or on disk. Reference sources are resolved on every connect, so `refresh_connection` picks up a rotated password.

- Passwords are masked (`postgres://user:***@host/db`) in every tool result and error
- The registry file is written atomically and with owner-only permissions (`0600`; best effort on Windows)
- Pass options such as `sslmode` in the connection string; they go to the driver unchanged
- Give the agent a database role with only the privileges it needs. A read-only role is the strongest guarantee

---

## Optional env

MCP client configs (`mcp.json` and equivalents) pass `env` into the server process. Those values are always **strings** (same as OS/`process.env`). Write `"1"` or `"30000"`, not bare JSON booleans or numbers. Invalid numbers and unknown write modes fall back to the defaults.

| Variable                      | Default                          | Meaning                                                          |
| ----------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `PG_MCP_REGISTRY_PATH`        | `~/.pg-mcp/connections.json`     | Registry file path                                               |
| `PG_MCP_REGISTRY_TTL_MS`      | `604800000`                      | Sliding TTL of a registered connection (7 days)                  |
| `PG_MCP_WRITES`               | `ask`                            | Write policy: `off`, `ask`, or `on`                              |
| `PG_MCP_ENABLE_WRITES`        | unset                            | When `"1"` / `"true"` / `"yes"`, same as `PG_MCP_WRITES=on`      |
| `PG_MCP_MAX_ROWS`             | `500`                            | Maximum rows a query returns, read from the server (then flagged `truncated`) |
| `PG_MCP_STATEMENT_TIMEOUT_MS` | `15000`                          | The server cancels a statement that runs longer                  |

`PG_MCP_WRITES`, when set, wins over `PG_MCP_ENABLE_WRITES`.

---

## Architecture

For the communication flow between the MCP client, the service layer, the registry, and PostgreSQL (including Mermaid diagrams), see [ARCHITECT.md](ARCHITECT.md).

Release history lives in [CHANGELOG.md](CHANGELOG.md). GitHub Release notes are taken from the matching version section when present.

---

## License

MIT © [fqueis](https://github.com/fqueis). See [LICENSE.md](LICENSE.md).
