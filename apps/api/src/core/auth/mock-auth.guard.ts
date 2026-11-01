import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { z } from "zod";

const mockUserId = "00000000-0000-4000-8000-000000000001";
const mockRoleSchema = z.enum(["MANAGER", "EMPLOYEE"]);
const mockUserIdSchema = z.uuid();
const mockPermissionSchema = z.enum(["organization.department.create"]);

interface MockAuthRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: {
    id: string;
    role: z.infer<typeof mockRoleSchema>;
    isSuperAdmin: boolean;
    permissions: z.infer<typeof mockPermissionSchema>[];
  };
}

@Injectable()
// TODO: [INTEGRATION] - Replace MockAuthGuard with the real JwtAuthGuard from the Auth module once available.
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (
      process.env.NODE_ENV !== "development" &&
      process.env.NODE_ENV !== "test"
    )
      throw new UnauthorizedException(
        "Mock authentication chỉ khả dụng trong development/test.",
      );

    const request = context.switchToHttp().getRequest<MockAuthRequest>();
    const userIdHeader = request.headers["x-mock-user-id"];
    const roleHeader = request.headers["x-mock-role"];
    const superAdminHeader = request.headers["x-mock-is-super-admin"];
    const permissionsHeader = request.headers["x-mock-permissions"];
    if (
      userIdHeader === undefined &&
      roleHeader === undefined &&
      superAdminHeader === undefined &&
      permissionsHeader === undefined
    ) {
      request.user = {
        id: mockUserId,
        role: "MANAGER",
        isSuperAdmin: true,
        permissions: [],
      };
      return true;
    }

    const userId = mockUserIdSchema.safeParse(userIdHeader);
    const role = mockRoleSchema.safeParse(roleHeader);
    const isSuperAdmin = z.enum(["true", "false"]).safeParse(superAdminHeader);
    const rawPermissions =
      typeof permissionsHeader === "string" && permissionsHeader.length
        ? permissionsHeader.split(",")
        : [];
    const permissions = z.array(mockPermissionSchema).safeParse(rawPermissions);
    if (
      !userId.success ||
      !role.success ||
      !isSuperAdmin.success ||
      !permissions.success ||
      (isSuperAdmin.data === "true" && role.data !== "MANAGER")
    )
      throw new UnauthorizedException("Header mock user/role không hợp lệ.");
    request.user = {
      id: userId.data,
      role: role.data,
      isSuperAdmin: isSuperAdmin.data === "true",
      permissions: permissions.data,
    };
    return true;
  }
}
