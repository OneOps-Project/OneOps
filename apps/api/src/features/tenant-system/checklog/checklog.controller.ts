import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import { z } from "zod";
import { ChecklogGuard } from "./guards/checklog.guard.js";
import { ChecklogService } from "./checklog.service.js";
import { checklogQuery } from "./dto/checklog.dto.js";
import { SchemaPipe } from "../../../core/pipes/validation.pipe.js";
@Controller("checklog")
@UseGuards(ChecklogGuard)
export class ChecklogController {
  constructor(private readonly service: ChecklogService) {}
  @Get() search(
    @Query(new SchemaPipe(checklogQuery)) query: z.infer<typeof checklogQuery>,
  ) {
    return this.service.search(query);
  }
  @Get("filters") filters() {
    return this.service.filters();
  }
  @Get(":id") get(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.service.get(id);
  }
}
