import {
  Injectable,
  UnauthorizedException,
  HttpException,
} from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import { TenantAuthRepository } from "./tenant-auth.repository.js";
import { AuthAccounts } from "./dto/tenant-auth.dto.js";
import type { Transaction } from "../../../../core/database/database.module.js";
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const sessionCookie = "oneops_session";
@Injectable()
export class TenantAuthService {
  constructor(
    private readonly repository: TenantAuthRepository,
    private readonly accounts: AuthAccounts,
  ) {}
  private token(cookie?: string) {
    const entry = cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(sessionCookie + "="));
    return entry?.slice(sessionCookie.length + 1);
  }
  async principal(cookie?: string) {
    const token = this.token(cookie);
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new UnauthorizedException("Vui lòng đăng nhập.");
    const session = await this.repository.session(digest(token));
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException(
        "Phiên đăng nhập đã hết hạn hoặc bị thu hồi.",
      );
    const actor = await this.accounts
      .identity(session.accountId)
      .catch(() => null);
    if (
      !actor ||
      actor.status !== "ACTIVE" ||
      actor.version !== session.accountVersion
    )
      throw new UnauthorizedException(
        "Tài khoản đã bị khóa hoặc không còn hợp lệ.",
      );
    return {
      id: actor.id,
      username: actor.username,
      role: actor.role,
      superAdmin: actor.superAdmin,
      manageAccounts: actor.manageAccounts,
    };
  }
  async login(username: string, password: string, ip: string) {
    const keys = [digest("user:" + username), digest("ip:" + ip)];
    const attempts = await Promise.all(
      keys.map((key) => this.repository.attempt(key)),
    );
    const window = Date.now() - 15 * 60 * 1000;
    if (
      attempts.some(
        (attempt, index) =>
          attempt &&
          attempt.updatedAt.getTime() > window &&
          attempt.failures >= (index === 0 ? 5 : 30),
      )
    )
      throw new HttpException(
        "Đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.",
        429,
      );
    const account = await this.accounts.authenticate(username, password);
    if (!account || account.status !== "ACTIVE") {
      await Promise.all(
        keys.map((key, index) =>
          this.repository.failure(
            key,
            !!attempts[index] && attempts[index]!.updatedAt.getTime() <= window,
          ),
        ),
      );
      throw new UnauthorizedException(
        "Tên đăng nhập, mật khẩu hoặc trạng thái tài khoản không hợp lệ.",
      );
    }
    await this.repository.success(keys[0]);
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await this.repository.create(
      digest(token),
      account.id,
      account.version,
      expiresAt,
    );
    const principal = {
      id: account.id,
      username: account.username,
      role: account.role,
      superAdmin: account.superAdmin,
      manageAccounts: account.manageAccounts,
    };
    return {
      principal,
      cookie: `${sessionCookie}=${token}; HttpOnly; Path=/api; SameSite=Strict; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    };
  }
  async logout(cookie?: string) {
    const token = this.token(cookie);
    if (token) await this.repository.logout(digest(token));
    return `${sessionCookie}=; HttpOnly; Path=/api; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  }
  revoke(id: string, tx: Transaction) {
    return this.repository.revoke(id, tx);
  }
}
