import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { databaseUrl } from "./database.mjs";
import { hashPassword } from "../dist/features/tenant-system/access-control/accounts/password.js";
export const testAdmin = {
  id: randomUUID(),
  employeeId: randomUUID(),
  username: "test-admin",
  email: "admin@example.test",
  password: "Test-only-password-123",
  code: "TEST-ADMIN",
  name: "Quản trị kiểm thử",
};
export async function seedTestIdentity() {
  if (!new URL(databaseUrl).pathname.endsWith("_test"))
    throw new Error("Identity fixtures require a dedicated _test database.");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const hash = await hashPassword(testAdmin.password);
    await client.query(
      'INSERT INTO "hr_employees"."employees" (id,code,name,email,"updatedAt") VALUES ($1,$2,$3,$4,NOW())',
      [testAdmin.employeeId, testAdmin.code, testAdmin.name, testAdmin.email],
    );
    await client.query(
      'INSERT INTO "tenant_accounts"."accounts" (id,"employeeId","employeeCode","displayName",username,email,role,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'MANAGER\',$7,NOW())',
      [
        testAdmin.id,
        testAdmin.employeeId,
        testAdmin.code,
        testAdmin.name,
        testAdmin.username,
        testAdmin.email,
        hash,
      ],
    );
    await client.query(
      'INSERT INTO "tenant_permissions"."account_permissions" ("accountId","superAdmin","manageAccounts","updatedAt") VALUES ($1,true,true,NOW())',
      [testAdmin.id],
    );
  } finally {
    await client.end();
  }
}
