-- describe-table: structure of one table or view as a single JSON document.
--
-- Parameters: $1 = schema name, $2 = table name.
-- Result: one row, column "result":
--   { schema, table,
--     columns:     [{ name, type, nullable, default }]            in declaration order,
--     primaryKey:  [column name]                                  in key order,
--     foreignKeys: [{ name, columns, referencesSchema, referencesTable, referencesColumns }],
--     indexes:     [{ name, definition }] }
-- No row is returned when the relation does not exist.
--
-- Reads pg_catalog directly: it is faster than information_schema and lists every
-- object, not only those the current role owns or can access.
SELECT jsonb_build_object(
  'schema', n.nspname,
  'table', c.relname,
  'columns', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', a.attname,
        'type', format_type(a.atttypid, a.atttypmod),
        'nullable', NOT a.attnotnull,
        'default', pg_get_expr(d.adbin, d.adrelid)
      )
      ORDER BY a.attnum
    )
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  ), '[]'::jsonb),
  'primaryKey', COALESCE((
    SELECT jsonb_agg(a.attname ORDER BY k.position)
    FROM pg_constraint con
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, position)
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
    WHERE con.conrelid = c.oid AND con.contype = 'p'
  ), '[]'::jsonb),
  'foreignKeys', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'name', con.conname,
        'columns', (
          SELECT jsonb_agg(a.attname ORDER BY k.position)
          FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, position)
          JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = k.attnum
        ),
        'referencesSchema', fn.nspname,
        'referencesTable', fc.relname,
        'referencesColumns', (
          SELECT jsonb_agg(a.attname ORDER BY k.position)
          FROM unnest(con.confkey) WITH ORDINALITY AS k(attnum, position)
          JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = k.attnum
        )
      )
      ORDER BY con.conname
    )
    FROM pg_constraint con
    JOIN pg_class fc ON fc.oid = con.confrelid
    JOIN pg_namespace fn ON fn.oid = fc.relnamespace
    WHERE con.conrelid = c.oid AND con.contype = 'f'
  ), '[]'::jsonb),
  'indexes', COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object('name', ic.relname, 'definition', pg_get_indexdef(i.indexrelid))
      ORDER BY ic.relname
    )
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    WHERE i.indrelid = c.oid
  ), '[]'::jsonb)
) AS result
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ('r', 'p', 'v', 'm', 'f');
