import { spawnSync } from "node:child_process";
const database =
  process.env.TEST_DATABASE_URL ||
  "postgresql://etctha:etctha_dev@127.0.0.1:55432/etctha_test";
if (!new URL(database).pathname.endsWith("_test"))
  throw new Error("Test database name must end in _test");
process.env.DATABASE_URL = database;
process.env.NODE_ENV = "test";
// TODO: [INTEGRATION] - Replace test-only mock authentication with real Auth integration.
const migration = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
    "--config",
    "packages/database/prisma.config.ts",
  ],
  { stdio: "inherit", env: process.env },
);
if (migration.status !== 0) process.exit(migration.status || 1);
const { createApp } = await import("../apps/api/dist/bootstrap.js");
const app = await createApp();
await app.listen(4117, "127.0.0.1");
