import { z } from "zod";
import type { JsonValue } from "./types.js";
const hidden = "[Đã che]";
const normalize = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
function confidential(key: string) {
  return /password|passwd|pwd|token|secret|cookie|authorization|credential|apikey|privatekey/.test(
    normalize(key),
  );
}
function personal(key: string) {
  return /phone|telephone|mobile|nationalid|identitycard|cccd|cmnd|passport|taxcode|taxid|bankaccount|accountnumber|insurance|dateofbirth|birthdate|address|salary|wage|compensation|payroll|basepay|income/.test(
    normalize(key),
  );
}
export function redactText(text: string): string {
  return text
    .replace(
      /([A-Z0-9._%+-])[A-Z0-9._%+-]*@([A-Z0-9.-]+\.[A-Z]{2,})/gi,
      "$1***@$2",
    )
    .replace(/Bearer\s+[A-Z0-9._~+/-]+=*/gi, "Bearer [Đã che]")
    .replace(
      /((?:password|token|secret|api[_-]?key)\s*[=:]\s*)[^\n,;&]+/gi,
      "$1[Đã che]",
    );
}
export function redactValue(value: JsonValue, key = ""): JsonValue {
  if (confidential(key)) {
    if (
      typeof value === "boolean" &&
      /changed|configured|enabled|present/.test(normalize(key))
    )
      return value;
    return hidden;
  }
  if (personal(key)) return value === null ? null : hidden;
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        redactValue(item, name),
      ]),
    );
  if (typeof value === "string") return redactText(value);
  return value;
}
export function redactSnapshot(
  value: unknown,
): Record<string, JsonValue> | null {
  if (value == null) return null;
  const parsed = z.record(z.string(), z.json()).safeParse(value);
  if (!parsed.success) return { value: "[Không thể hiển thị dữ liệu gốc]" };
  return redactValue(parsed.data) as Record<string, JsonValue>;
}
