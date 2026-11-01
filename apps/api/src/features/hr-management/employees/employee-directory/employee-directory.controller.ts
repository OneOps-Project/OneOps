import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { z } from "zod";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { employeeInput } from "./dto/employee-directory.dto.js";
import { EmployeeDirectoryService } from "./employee-directory.service.js";
export abstract class EmployeeDirectoryAccess {
  abstract authorize(cookie?: string): Promise<void>;
}
@Injectable()
export class EmployeeDirectoryGuard implements CanActivate {
  constructor(private readonly access: EmployeeDirectoryAccess) {}
  async canActivate(context: ExecutionContext) {
    await this.access.authorize(
      context.switchToHttp().getRequest<{ headers: { cookie?: string } }>()
        .headers.cookie,
    );
    return true;
  }
}
@Controller("employees")
@UseGuards(EmployeeDirectoryGuard)
export class EmployeeDirectoryController {
  constructor(
    private readonly access: EmployeeDirectoryAccess,
    private readonly service: EmployeeDirectoryService,
  ) {}
  @Post() async create(
    @Body(new SchemaPipe(employeeInput)) input: z.infer<typeof employeeInput>,
    @Req() req: { headers: { cookie?: string } },
  ) {
    await this.access.authorize(req.headers.cookie);
    return this.service.create(input);
  }
}
