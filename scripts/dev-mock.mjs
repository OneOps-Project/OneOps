import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiEnvPath = path.join(root, "apps/api/.env");
const apiEnv = existsSync(apiEnvPath)
  ? parseEnv(readFileSync(apiEnvPath, "utf8"))
  : {};
const databaseUrl = process.env.MOCK_DATABASE_URL ?? apiEnv.MOCK_DATABASE_URL;

if (!databaseUrl)
  throw new Error(
    "Set MOCK_DATABASE_URL to a dedicated local PostgreSQL database ending in _mock before using dev:mock.",
  );

const database = new URL(databaseUrl);
if (
  !["postgres:", "postgresql:"].includes(database.protocol) ||
  !["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname) ||
  !decodeURIComponent(database.pathname.slice(1)).endsWith("_mock")
)
  throw new Error(
    "dev:mock only resets a local PostgreSQL database whose name ends in _mock.",
  );

const env = { ...process.env, DATABASE_URL: databaseUrl };
// WARNING: This intentionally resets only the explicitly configured *_mock database before local development. Remove before production.
const reset = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "reset",
    "--force",
    "--config",
    "packages/database/prisma.config.ts",
  ],
  { cwd: root, env, stdio: "inherit" },
);
if (reset.status !== 0) process.exit(reset.status ?? 1);

const dev = spawn("npm", ["run", "dev"], {
  cwd: root,
  env,
  stdio: "inherit",
});
dev.on("exit", (code, signal) => {
  process.exitCode =
    code ?? (signal === "SIGINT" ? 130 : signal === "SIGTERM" ? 143 : 1);
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (!dev.killed) dev.kill(signal);
  });
}
