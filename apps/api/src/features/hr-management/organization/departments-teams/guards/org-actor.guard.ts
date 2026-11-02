import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { z } from "zod";

const actorSchema = z.object({
  id: z.uuid(),
  role: z.enum(["MANAGER", "EMPLOYEE"]),
  isSuperAdmin: z.boolean(),
  permissions: z.array(z.enum(["organization.department.create"])),
});

export type OrgActor = z.infer<typeof actorSchema>;

export interface OrganizationRequest {
  user?: unknown;
  orgActor?: OrgActor;
}

@Injectable()
export class OrgActorGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<OrganizationRequest>();
    const parsed = actorSchema.safeParse(request.user);
    if (!parsed.success)
      throw new UnauthorizedException(
        "Yêu cầu cần có thông tin người dùng đã xác thực.",
      );
    request.orgActor = parsed.data;
    return true;
  }
}

export function getOrganizationActor(request: OrganizationRequest) {
  if (!request.orgActor)
    throw new UnauthorizedException(
      "Yêu cầu cần có thông tin người dùng đã xác thực.",
    );
  return request.orgActor;
}
