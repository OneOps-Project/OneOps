import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { z } from "zod";
import { AccountsService } from "./accounts.service.js";
import { AccountsGuard, type AccountRequest } from "./guards/accounts.guard.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  createAccountSchema,
  updateAccountSchema,
  changeRoleSchema,
  changeStatusSchema,
  resetPasswordSchema,
  listAccountsSchema,
  groupInputSchema,
  groupUpdateSchema,
} from "./dto/accounts.dto.js";
const pageSchema = z
  .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
  .strict();
const searchSchema = z
  .object({ q: z.string().trim().max(200).default("") })
  .strict();
@Controller("accounts")
@UseGuards(AccountsGuard)
export class AccountsController {
  constructor(private readonly service: AccountsService) {}
  @Get() list(
    @Query(new SchemaPipe(listAccountsSchema))
    query: z.infer<typeof listAccountsSchema>,
  ) {
    return this.service.list(query);
  }
  @Post() create(
    @Body(new SchemaPipe(createAccountSchema))
    input: z.infer<typeof createAccountSchema>,
    @Req() request: AccountRequest,
  ) {
    return this.service.create(input, request.actor);
  }
  @Get("employees") employees(
    @Query(new SchemaPipe(searchSchema)) query: z.infer<typeof searchSchema>,
  ) {
    return this.service.employeesForAccounts(query.q);
  }
  @Get("groups") groups(
    @Query(new SchemaPipe(searchSchema)) query: z.infer<typeof searchSchema>,
  ) {
    return this.service.groups(query.q);
  }
  @Post("groups") createGroup(
    @Body(new SchemaPipe(groupInputSchema))
    input: z.infer<typeof groupInputSchema>,
    @Req() request: AccountRequest,
  ) {
    return this.service.saveGroup(input, request.actor);
  }
  @Get("groups/:id/history") groupHistory(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(pageSchema)) query: z.infer<typeof pageSchema>,
  ) {
    return this.service.groupHistory(id, query.page);
  }
  @Patch("groups/:id") updateGroup(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(groupUpdateSchema))
    input: z.infer<typeof groupUpdateSchema>,
    @Req() request: AccountRequest,
  ) {
    return this.service.saveGroup(input, request.actor, id, input.version);
  }
  @Get(":id/history") history(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new SchemaPipe(pageSchema)) query: z.infer<typeof pageSchema>,
  ) {
    return this.service.history(id, query.page);
  }
  @Get(":id") get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.get(id);
  }
  @Patch(":id") update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateAccountSchema))
    input: z.infer<typeof updateAccountSchema>,
    @Req() request: AccountRequest,
  ) {
    return this.service.update(id, input, request.actor);
  }
  @Post(":id/status") status(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(changeStatusSchema))
    input: z.infer<typeof changeStatusSchema>,
    @Req() request: AccountRequest,
  ) {
    return this.service.changeStatus(
      id,
      input.status,
      input.reason,
      input.version,
      request.actor,
    );
  }
  @Post(":id/role") role(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(changeRoleSchema))
    input: z.infer<typeof changeRoleSchema>,
    @Req() request: AccountRequest,
  ) {
    return this.service.changeRole(
      id,
      input.role,
      input.version,
      request.actor,
    );
  }
  @Post(":id/password") password(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(resetPasswordSchema))
    input: z.infer<typeof resetPasswordSchema>,
    @Req() request: AccountRequest,
  ) {
    return this.service.resetPassword(
      id,
      input.password,
      input.version,
      request.actor,
    );
  }
}
