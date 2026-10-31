import { Client } from "pg";
export const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://etctha:etctha_dev@127.0.0.1:55432/etctha_test";
if (!new URL(databaseUrl).pathname.endsWith("_test"))
  throw new Error(
    "TEST_DATABASE_URL must point to a dedicated database ending in _test",
  );
export async function runSql(statement, values = []) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await client.query(statement, values);
  } finally {
    await client.end();
  }
}

export async function cleanDatabase() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { default: modules } = await import("../../../modules.json", {
      with: { type: "json" },
    });
    const schemas = [...new Set(modules.map((m) => m.databaseSchema))];
    const { rows } = await client.query(
      `SELECT table_schema, table_name
         FROM information_schema.tables
        WHERE table_schema = ANY($1::text[]) AND table_type = 'BASE TABLE'`,
      [schemas],
    );
    const tables = rows.map(
      (row) => `"${row.table_schema}"."${row.table_name}"`,
    );
    if (tables.length)
      await client.query(`TRUNCATE ${tables.join(", ")} CASCADE`);
  } finally {
    await client.end();
  }
}
