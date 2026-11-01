import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { ChecklogAccess } from "../checklog.access.js";
@Injectable()
export class ChecklogGuard implements CanActivate {
  constructor(private readonly access: ChecklogAccess) {}
  async canActivate(context: ExecutionContext) {
    await this.access.authorize(
      context.switchToHttp().getRequest<{ headers: { cookie?: string } }>()
        .headers.cookie,
    );
    return true;
  }
}
