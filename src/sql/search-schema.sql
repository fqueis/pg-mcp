-- search-schema: tables and columns whose name contains a term.
--
-- Parameters: $1 = text to look for, matched case-insensitively anywhere in a name
--                  (the characters % and _ in it are matched literally),
--             $2 = schema name to restrict the search to, or NULL for every user schema,
--             $3 = maximum number of matches returned for tables and for columns, each.
-- Result: one row, column "result":
--   { tables:  [{ schema, name, type }]                   ordered by schema and name,
--     columns: [{ schema, table, column, type }] }        ordered by schema, table, and position.
-- Internal pg_* schemas and information_schema are never searched.
WITH pattern AS (
  SELECT '%' || replace(replace(replace($1::text, '\', '\\'), '%', '\%'), '_', '\_') || '%' AS value
),
matched_tables AS (
  SELECT n.nspname AS schema,
         c.relname AS name,
         CASE c.relkind
           WHEN 'r' THEN 'table'
           WHEN 'p' THEN 'table'
           WHEN 'v' THEN 'view'
           WHEN 'm' THEN 'materialized view'
           WHEN 'f' THEN 'foreign table'
         END AS type
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN pattern
  WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND c.relname ILIKE pattern.value
    AND n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema'
    AND ($2::text IS NULL OR n.nspname = $2::text)
  ORDER BY n.nspname, c.relname
  LIMIT $3
),
matched_columns AS (
  SELECT n.nspname AS schema,
         c.relname AS "table",
         a.attname AS "column",
         format_type(a.atttypid, a.atttypmod) AS type,
         a.attnum AS position
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN pattern
  WHERE a.attnum > 0 AND NOT a.attisdropped
    AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
    AND a.attname ILIKE pattern.value
    AND n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema'
    AND ($2::text IS NULL OR n.nspname = $2::text)
  ORDER BY n.nspname, c.relname, a.attnum
  LIMIT $3
)
SELECT jsonb_build_object(
  'tables', COALESCE(
    (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.schema, t.name) FROM matched_tables t),
    '[]'::jsonb
  ),
  'columns', COALESCE(
    (SELECT jsonb_agg(to_jsonb(c) - 'position' ORDER BY c.schema, c."table", c.position) FROM matched_columns c),
    '[]'::jsonb
  )
) AS result;
