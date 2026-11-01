import { Client } from "pg";
export const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://etctha:etctha_dev@127.0.0.1:55432/etctha_test";
if (!new URL(databaseUrl).pathname.endsWith("_test"))
  throw new Error(
    "TEST_DATABASE_URL must point to a dedicated database ending in _test",
  );
export async function cleanDatabase() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { default: modules } = await import("../../../modules.json", {
      with: { type: "json" },
    });
    const tables = modules.flatMap((m) =>
      (m.tables || ["records"]).map(
        (table) => `"${m.databaseSchema}"."${table}"`,
      ),
    );
    await client.query(`TRUNCATE ${tables.join(", ")} CASCADE`);
  } finally {
    await client.end();
  }
}
