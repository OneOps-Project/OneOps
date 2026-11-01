import { test as base, expect } from "@playwright/test";
import { seedTestIdentity, testAdmin } from "../apps/api/test/identity.mjs";
import { cleanDatabase } from "../apps/api/test/database.mjs";
export const test = base.extend<{ databaseClean: void }>({
  databaseClean: [
    async ({ context }, use) => {
      await cleanDatabase();
      await seedTestIdentity();
      const response = await context.request.post(
        "http://localhost:3117/api/v1/auth/login",
        {
          data: { username: testAdmin.username, password: testAdmin.password },
        },
      );
      expect(response.status()).toBe(201);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
