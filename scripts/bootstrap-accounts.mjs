import fs from "node:fs";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
if (!process.stdin.isTTY)
  throw new Error(
    "Chạy lệnh trong terminal tương tác để nhập thông tin quản trị.",
  );
for (const [key, value] of Object.entries(
  parseEnv(fs.readFileSync("apps/api/.env", "utf8")),
))
  process.env[key] ??= value;
let hidden = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    process.stdout.write(hidden ? "*" : chunk);
    done();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
let app;
try {
  const code = await rl.question("Mã nhân viên quản trị: ");
  const name = await rl.question("Họ tên: ");
  const email = await rl.question("Email công việc: ");
  const username = await rl.question("Tên đăng nhập: ");
  process.stdout.write("Mật khẩu (ít nhất 12 ký tự, có chữ và số): ");
  hidden = true;
  const password = await rl.question("");
  hidden = false;
  process.stdout.write("\n");
  const { createApp } = await import("../apps/api/dist/bootstrap.js");
  const { AccountSetupService } =
    await import("../apps/api/dist/features/tenant-system/index.js");
  app = await createApp();
  await app
    .get(AccountSetupService)
    .bootstrap({ code, name, email, username, password });
  console.log(
    "Đã khởi tạo quản trị cấp cao. Đăng nhập tại /tenant-system/accounts.",
  );
} finally {
  hidden = false;
  rl.close();
  await app?.close();
}
