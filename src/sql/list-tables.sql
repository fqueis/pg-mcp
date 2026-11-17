-- list-tables: tables, views, materialized views, and foreign tables of one schema.
--
-- Parameters: $1 = schema name.
-- Result: one row, column "result": a JSON array of { name, type } ordered by name,
-- where type is one of 'table', 'view', 'materialized view', 'foreign table'.
SELECT COALESCE(
  jsonb_agg(
    jsonb_build_object(
      'name', c.relname,
      'type', CASE c.relkind
        WHEN 'r' THEN 'table'
        WHEN 'p' THEN 'table'
        WHEN 'v' THEN 'view'
        WHEN 'm' THEN 'materialized view'
        WHEN 'f' THEN 'foreign table'
      END
    )
    ORDER BY c.relname
  ),
  '[]'::jsonb
) AS result
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = $1 AND c.relkind IN ('r', 'p', 'v', 'm', 'f');
