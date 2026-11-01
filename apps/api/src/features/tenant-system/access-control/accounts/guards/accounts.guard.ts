import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AccountsAccess, type AccountActor } from "../accounts.contracts.js";
export type AccountRequest = {
  headers: { cookie?: string };
  actor: AccountActor;
};
@Injectable()
export class AccountsGuard implements CanActivate {
  constructor(private readonly access: AccountsAccess) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AccountRequest>();
    request.actor = await this.access.authorize(request.headers.cookie);
    return true;
  }
}
