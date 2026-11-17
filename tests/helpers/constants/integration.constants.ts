/** Environment variable that holds the connection string of a disposable PostgreSQL for the integration spec. */
export const TEST_DATABASE_URL_ENV = 'PG_MCP_TEST_URL';

/** Prefix of the throwaway schema the integration spec creates and drops. */
export const INTEGRATION_SCHEMA_PREFIX = 'pgmcp_it_';

/** Location of the SQL fixture that builds the sample shop schema. */
export const SHOP_SCHEMA_FIXTURE = new URL('../../fixtures/shop-schema.sql', import.meta.url);
