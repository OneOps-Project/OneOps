import { Controller, Get, Post, Body, Req, Res } from "@nestjs/common";
import { z } from "zod";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { loginInput } from "./dto/tenant-auth.dto.js";
import { TenantAuthService } from "./tenant-auth.service.js";
type AuthRequest = { headers: { cookie?: string }; ip?: string };
type AuthResponse = { setHeader(name: string, value: string): void };
@Controller("auth")
export class TenantAuthController {
  constructor(private readonly service: TenantAuthService) {}
  @Post("login") async login(
    @Body(new SchemaPipe(loginInput)) input: z.infer<typeof loginInput>,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: AuthResponse,
  ) {
    const result = await this.service.login(
      input.username,
      input.password,
      request.ip || "unknown",
    );
    response.setHeader("Set-Cookie", result.cookie);
    return result.principal;
  }
  @Get("me") me(@Req() request: AuthRequest) {
    return this.service.principal(request.headers.cookie);
  }
  @Post("logout") async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: AuthResponse,
  ) {
    response.setHeader(
      "Set-Cookie",
      await this.service.logout(request.headers.cookie),
    );
    return { success: true };
  }
}
