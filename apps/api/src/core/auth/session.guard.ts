import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
export type AccessRequest = {
  path?: string;
  url: string;
  method: string;
  headers: { cookie?: string; origin?: string };
};
export abstract class RequestAccessPolicy {
  abstract authorize(request: AccessRequest): Promise<void>;
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly policy: RequestAccessPolicy) {}
  async canActivate(context: ExecutionContext) {
    await this.policy.authorize(
      context.switchToHttp().getRequest<AccessRequest>(),
    );
    return true;
  }
}
