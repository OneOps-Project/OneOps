import {
  Body,
  Controller,
  Get,
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
  createLineSchema,
  createPeriodSchema,
  lineQuery,
  periodQuery,
  updateLineSchema,
  updatePeriodSchema,
} from "./dto/attendance-reports.dto.js";
import { AttendanceReportsService } from "./attendance-reports.service.js";

const FEATURE = "hr-management/attendance/attendance-reports";

@Controller("attendance-reports")
export class AttendanceReportsController {
  constructor(private readonly service: AttendanceReportsService) {}

  @Get("periods")
  @RequirePermission(FEATURE, "view")
  listPeriods(
    @Query(new SchemaPipe(periodQuery)) query: z.infer<typeof periodQuery>,
  ) {
    return this.service.listPeriods(query);
  }

  @Post("periods")
  @RequirePermission(FEATURE, "create")
  createPeriod(
    @Body(new SchemaPipe(createPeriodSchema))
    input: z.infer<typeof createPeriodSchema>,
  ) {
    return this.service.createPeriod(input);
  }

  @Patch("periods/:id")
  @RequirePermission(FEATURE, "update")
  updatePeriod(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updatePeriodSchema))
    input: z.infer<typeof updatePeriodSchema>,
  ) {
    return this.service.updatePeriod(id, input);
  }

  @Get("periods/:id/summary")
  @RequirePermission(FEATURE, "view")
  summary(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.summary(id);
  }

  @Get("lines")
  @RequirePermission(FEATURE, "view")
  listLines(
    @Query(new SchemaPipe(lineQuery)) query: z.infer<typeof lineQuery>,
  ) {
    return this.service.listLines(query);
  }

  @Post("lines")
  @RequirePermission(FEATURE, "create")
  createLine(
    @Body(new SchemaPipe(createLineSchema))
    input: z.infer<typeof createLineSchema>,
  ) {
    return this.service.createLine(input);
  }

  @Patch("lines/:id")
  @RequirePermission(FEATURE, "update")
  updateLine(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateLineSchema))
    input: z.infer<typeof updateLineSchema>,
  ) {
    return this.service.updateLine(id, input);
  }
}
