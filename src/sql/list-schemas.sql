-- list-schemas: user schemas of the database.
--
-- Parameters: none.
-- Result: one row, column "result": a JSON array of schema names in alphabetical
-- order. Internal pg_* schemas and information_schema are hidden.
SELECT COALESCE(jsonb_agg(nspname ORDER BY nspname), '[]'::jsonb) AS result
FROM pg_namespace
WHERE nspname NOT LIKE 'pg\_%' AND nspname <> 'information_schema';
