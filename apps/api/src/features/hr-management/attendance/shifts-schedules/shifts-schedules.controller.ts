import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import { RequirePermission } from "../../../../core/auth/actor-context.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import {
  applyPatternSchema,
  bulkSchema,
  createAssignmentSchema,
  createPatternSchema,
  createShiftSchema,
  listQuery,
  updateAssignmentSchema,
  updatePatternSchema,
  updateShiftSchema,
} from "./dto/shifts-schedules.dto.js";
import { ShiftsSchedulesService } from "./shifts-schedules.service.js";

const FEATURE = "hr-management/attendance/shifts-schedules";

@Controller("shifts-schedules")
export class ShiftsSchedulesController {
  constructor(private readonly service: ShiftsSchedulesService) {}

  @Get("shifts")
  @RequirePermission(FEATURE, "view")
  listShifts(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.listShifts(query);
  }

  @Post("shifts")
  @RequirePermission(FEATURE, "create")
  createShift(
    @Body(new SchemaPipe(createShiftSchema))
    input: z.infer<typeof createShiftSchema>,
  ) {
    return this.service.createShift(input);
  }

  @Patch("shifts/:id")
  @RequirePermission(FEATURE, "update")
  updateShift(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateShiftSchema))
    input: z.infer<typeof updateShiftSchema>,
  ) {
    return this.service.updateShift(id, input);
  }

  @Get("patterns")
  @RequirePermission(FEATURE, "view")
  listPatterns(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.listPatterns(query);
  }

  @Post("patterns")
  @RequirePermission(FEATURE, "create")
  createPattern(
    @Body(new SchemaPipe(createPatternSchema))
    input: z.infer<typeof createPatternSchema>,
  ) {
    return this.service.createPattern(input);
  }

  @Patch("patterns/:id")
  @RequirePermission(FEATURE, "update")
  updatePattern(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updatePatternSchema))
    input: z.infer<typeof updatePatternSchema>,
  ) {
    return this.service.updatePattern(id, input);
  }

  @Post("patterns/:id/apply")
  @HttpCode(200)
  @RequirePermission(FEATURE, "update")
  applyPattern(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(applyPatternSchema))
    input: z.infer<typeof applyPatternSchema>,
  ) {
    return this.service.applyPattern(id, input);
  }

  @Get("assignments")
  @RequirePermission(FEATURE, "view")
  listAssignments(
    @Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>,
  ) {
    return this.service.listAssignments(query);
  }

  @Post("assignments")
  @RequirePermission(FEATURE, "create")
  createAssignment(
    @Body(new SchemaPipe(createAssignmentSchema))
    input: z.infer<typeof createAssignmentSchema>,
  ) {
    return this.service.createAssignment(input);
  }

  @Post("assignments/bulk")
  @HttpCode(200)
  @RequirePermission(FEATURE, "update")
  bulkAssign(
    @Body(new SchemaPipe(bulkSchema)) input: z.infer<typeof bulkSchema>,
  ) {
    return this.service.bulkAssign(input);
  }

  @Patch("assignments/:id")
  @RequirePermission(FEATURE, "update")
  updateAssignment(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateAssignmentSchema))
    input: z.infer<typeof updateAssignmentSchema>,
  ) {
    return this.service.updateAssignment(id, input);
  }
}
