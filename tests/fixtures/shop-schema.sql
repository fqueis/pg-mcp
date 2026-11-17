-- Fixture for the real-PostgreSQL integration spec. Names are unqualified: the spec
-- creates a throwaway schema and sets the search_path to it before running this file.
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');

CREATE TABLE customers (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE
);

CREATE TABLE orders (
  id serial PRIMARY KEY,
  customer_id integer REFERENCES customers (id),
  total numeric(10, 2) NOT NULL DEFAULT 0,
  note varchar(40),
  status order_status NOT NULL DEFAULT 'pending'
);

CREATE INDEX orders_customer_idx ON orders (customer_id);

CREATE TABLE order_items (
  order_id integer NOT NULL,
  line integer NOT NULL,
  sku text,
  PRIMARY KEY (order_id, line),
  FOREIGN KEY (order_id) REFERENCES orders (id)
);

CREATE VIEW recent_orders AS SELECT * FROM orders;

INSERT INTO customers (email) VALUES ('ada@example.com'), ('grace@example.com');

-- Only customers gets statistics, so the spec can see both an analyzed and a never-analyzed table.
ANALYZE customers;
