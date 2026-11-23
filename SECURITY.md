# Security policy

## Supported versions

Only the latest published version of `@fqueis/pg-mcp` receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private
vulnerability reporting: open the **Security** tab of the repository and choose
**Report a vulnerability**.

Include the version, the tool involved, and the smallest input that shows the problem.
A report is acknowledged as soon as it is read, and a fix is released before the details are made public.

## What the server promises

- `query` and `explain` run inside a `READ ONLY` transaction, one statement per call.
- `execute` is refused, approved by the human through MCP elicitation, or allowed, depending on `PG_MCP_WRITES`.
  Without elicitation the approval is only the agent's own claim, a soft guard.
- Passwords are masked in tool results and errors. A literal `databaseUrl` is stored in the registry file as given;
  prefer `envVar` or `envFile`.

The strongest protection is still a database role that has only the privileges the agent needs.
