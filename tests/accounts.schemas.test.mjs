import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createAccountSchema,
  updateAccountSchema,
  groupInputSchema,
} from "../apps/api/dist/features/tenant-system/access-control/accounts/dto/accounts.dto.js";
import {
  hashPassword,
  verifyPassword,
} from "../apps/api/dist/features/tenant-system/access-control/accounts/password.js";
const input = () => ({
  employeeId: randomUUID(),
  username: " USER.Name ",
  email: "USER@EXAMPLE.COM",
  role: "EMPLOYEE",
  password: "Example-password-123",
});
test("account input normalizes identifiers and refuses arbitrary roles or privileges", () => {
  const value = createAccountSchema.parse(input());
  assert.equal(value.username, "user.name");
  assert.equal(value.email, "user@example.com");
  assert.equal(
    createAccountSchema.safeParse({ ...input(), role: "OWNER" }).success,
    false,
  );
  assert.equal(
    createAccountSchema.safeParse({ ...input(), manageAccounts: true }).success,
    false,
  );
  assert.equal(
    createAccountSchema.safeParse({ ...input(), password: "short" }).success,
    false,
  );
  assert.equal(
    createAccountSchema.safeParse({ ...input(), employeeId: "missing" })
      .success,
    false,
  );
});
test("updates require an optimistic version and cannot mutate the employee link or credentials", () => {
  assert.equal(
    updateAccountSchema.safeParse({
      username: "valid-user",
      email: "a@example.com",
    }).success,
    false,
  );
  assert.equal(
    updateAccountSchema.safeParse({
      username: "valid-user",
      email: "a@example.com",
      version: 1,
      password: "Example-password-123",
    }).success,
    false,
  );
  assert.equal(
    updateAccountSchema.safeParse({
      username: "valid-user",
      email: "a@example.com",
      version: 0,
    }).success,
    false,
  );
});
test("groups reject duplicate member identifiers", () => {
  const id = randomUUID();
  assert.equal(
    groupInputSchema.safeParse({
      name: "Test",
      directory: "test-group",
      ownerId: id,
      memberIds: [id, id],
    }).success,
    false,
  );
});
test("passwords use independent salts and only the correct password verifies", async () => {
  const password = "Example-password-123";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("different-password", first), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});
