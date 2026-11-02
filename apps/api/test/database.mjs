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
    const tables = [
      ...modules
        .filter((m) => m.recordTable !== false)
        .map((m) => `"${m.databaseSchema}"."${m.recordTable ?? "records"}"`),
      '"hr_organization"."org_history"',
      '"hr_organization"."team_access_groups"',
      '"hr_organization"."team_memberships"',
      '"hr_organization"."department_access_groups"',
      '"hr_organization"."department_access_users"',
      '"hr_organization"."department_administrators"',
      '"hr_organization"."teams"',
      '"hr_organization"."departments"',
    ];
    await client.query(`TRUNCATE ${tables.join(", ")} CASCADE`);
  } finally {
    await client.end();
  }
}
