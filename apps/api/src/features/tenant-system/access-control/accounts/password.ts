import { randomBytes, scrypt as derive, timingSafeEqual } from "node:crypto";
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt);
  return `scrypt:${salt}:${key.toString("hex")}`;
}
function scrypt(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    derive(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hex] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = await scrypt(password, salt);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
