import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  redactSnapshot,
  redactText,
} from "../apps/api/dist/features/tenant-system/checklog/redaction.js";
import {
  checklogQuery,
  auditInputSchema,
} from "../apps/api/dist/features/tenant-system/checklog/dto/checklog.dto.js";
test("recursive masking preserves audit flags and leaves source payload unchanged", () => {
  const original = {
    password: "secret-123",
    passwordChanged: true,
    child: {
      access_token: "token-123",
      phone: "0123456789",
      email: "person@example.test",
      salary: 20000,
    },
    list: [{ cookie: "session-secret" }],
    name: "Nguyễn Văn A",
  };
  const masked = redactSnapshot(original);
  assert.equal(masked.password, "[Đã che]");
  assert.equal(masked.passwordChanged, true);
  assert.equal(masked.child.access_token, "[Đã che]");
  assert.equal(masked.list[0].cookie, "[Đã che]");
  assert.equal(masked.child.salary, "[Đã che]");
  assert.equal(masked.child.email, "p***@example.test");
  assert.equal(original.password, "secret-123");
  assert.equal(masked.name, original.name);
});
test("free text hides emails and obvious bearer credentials", () => {
  const text = redactText(
    "Contact alice@example.test Authorization: Bearer secret-123 token=abc",
  );
  assert.equal(text.includes("alice@example.test"), false);
  assert.equal(text.includes("secret-123"), false);
  assert.equal(text.includes("token=abc"), false);
});
test("invalid snapshots fail closed without returning original payload", () => {
  assert.equal(redactSnapshot(null), null);
  assert.deepEqual(redactSnapshot("secret payload"), {
    value: "[Không thể hiển thị dữ liệu gốc]",
  });
});
test("audit input fixes server-owned timestamp and validates result/module identity", () => {
  const event = {
    module: "tenant-system/checklog",
    actorId: randomUUID(),
    actorName: "tester",
    action: "audit.tested",
    entityType: "account",
    entityId: randomUUID(),
  };
  assert.equal(auditInputSchema.parse(event).result, "SUCCESS");
  assert.equal(
    auditInputSchema.safeParse({ ...event, createdAt: "2020-01-01" }).success,
    false,
  );
  assert.equal(
    auditInputSchema.safeParse({ ...event, result: "UNKNOWN" }).success,
    false,
  );
  assert.equal(
    auditInputSchema.safeParse({ ...event, module: "invalid-module" }).success,
    false,
  );
});
test("date order, UUIDs and pagination are checked before querying", () => {
  assert.equal(
    checklogQuery.safeParse({ from: "2026-10-31", to: "2026-10-01" }).success,
    false,
  );
  assert.equal(checklogQuery.safeParse({ entityId: "wrong" }).success, false);
  assert.equal(checklogQuery.safeParse({ pageSize: 101 }).success, false);
  assert.equal(checklogQuery.parse({}).pageSize, 20);
});

test("obvious free-text secrets containing spaces are fully masked", () => {
  const text = redactText("password=do not disclose this phrase; next=safe");
  assert.equal(text.includes("disclose"), false);
  assert.equal(text.includes("next=safe"), true);
});
