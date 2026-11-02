import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { z } from "zod";
import {
  validatedCreateSchema as createSchema,
  updateSchema,
  listQuery,
  versionSchema,
} from "./dto/positions-grades.dto.js";
import { SchemaPipe } from "../../../../core/pipes/validation.pipe.js";
import { PositionsGradesService } from "./positions-grades.service.js";

@Controller("positions-grades")
export class PositionsGradesController {
  constructor(private readonly service: PositionsGradesService) {}

  @Get()
  list(@Query(new SchemaPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.service.list(query);
  }

  @Post()
  create(
    @Body(new SchemaPipe(createSchema)) input: z.infer<typeof createSchema>,
  ) {
    return this.service.create(input);
  }

  @Get(":id")
  get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.get(id);
  }

  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(updateSchema)) input: z.infer<typeof updateSchema>,
  ) {
    return this.service.update(id, input);
  }

  @Delete(":id")
  remove(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new SchemaPipe(versionSchema)) input: z.infer<typeof versionSchema>,
  ) {
    return this.service.remove(id, input.version);
  }
}
