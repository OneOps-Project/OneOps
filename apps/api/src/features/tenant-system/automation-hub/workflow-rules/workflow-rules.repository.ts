import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  type AutomationRule,
  type AutomationRun,
} from "@oneops/database";
import { Database } from "../../../../core/database/database.module.js";
import {
  appliedActionSchema,
  actionSchema,
  conditionSchema,
  ruleSchema,
  runSchema,
} from "./dto/workflow-rules.dto.js";
import type {
  ActionSpec,
  AppliedAction,
  Condition,
  RuleDto,
  RuleInput,
  RulePatch,
  RunDto,
  RunsQuery,
} from "./dto/workflow-rules.dto.js";

const conditions = (value: string): Condition[] => {
  try {
    const parsed = JSON.parse(value || "[]") as unknown;
    const result = conditionSchema.array().safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
};

const actions = (value: string): ActionSpec[] => {
  try {
    const parsed = JSON.parse(value || "[]") as unknown;
    const result = actionSchema.array().safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
};

const applied = (value: string): AppliedAction[] => {
  try {
    const parsed = JSON.parse(value || "[]") as unknown;
    const result = appliedActionSchema.array().safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
};

@Injectable()
export class WorkflowRulesRepository {
  constructor(private readonly db: Database) {}

  private table() {
    return this.db.automationRule;
  }

  private dto(row: AutomationRule): RuleDto {
    return ruleSchema.parse({
      id: row.id,
      name: row.name,
      description: row.description,
      trigger: row.trigger,
      condition: conditions(row.condition),
      actions: actions(row.actions),
      enabled: row.enabled,
      stopOnMatch: row.stopOnMatch,
      position: row.position,
      lockSeconds: row.lockSeconds,
      note: row.note,
      runCount: row.runCount,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  private runDto(row: AutomationRun): RunDto {
    return runSchema.parse({
      id: row.id,
      ruleId: row.ruleId,
      ruleName: row.ruleName,
      entityId: row.entityId,
      code: row.code,
      trigger: row.trigger,
      outcome: row.outcome,
      reason: row.reason,
      actions: applied(row.actions),
      createdAt: row.createdAt.toISOString(),
    });
  }

  async list() {
    const [rows, applied, skipped] = await Promise.all([
      this.table().findMany({
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      this.db.automationRun.count({ where: { outcome: "APPLIED" } }),
      this.db.automationRun.count({ where: { outcome: "SKIPPED" } }),
    ]);
    return { items: rows.map((row) => this.dto(row)), applied, skipped };
  }

  async get(id: string) {
    const row = await this.table().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy quy tắc này.");
    return this.dto(row);
  }

  /** Enabled rules of one entity, in evaluation order. */
  async enabled(entity: string) {
    const rows = await this.table().findMany({
      where: { entity, enabled: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => this.dto(row));
  }

  async create(input: RuleInput) {
    try {
      const row = await this.table().create({
        data: {
          name: input.name,
          description: input.description,
          trigger: input.trigger,
          condition: JSON.stringify(input.condition),
          actions: JSON.stringify(input.actions),
          enabled: input.enabled,
          stopOnMatch: input.stopOnMatch,
          position: input.position,
          lockSeconds: input.lockSeconds,
          note: input.note,
        },
      });
      return this.dto(row);
    } catch (error) {
      throw this.duplicate(error);
    }
  }

  /** Optimistic update: a stale version rejects instead of overwriting. */
  async update(id: string, input: RulePatch) {
    const data: Prisma.AutomationRuleUpdateManyMutationInput = {
      version: { increment: 1 },
    };
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.trigger !== undefined) data.trigger = input.trigger;
    if (input.condition !== undefined)
      data.condition = JSON.stringify(input.condition);
    if (input.actions !== undefined)
      data.actions = JSON.stringify(input.actions);
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.stopOnMatch !== undefined) data.stopOnMatch = input.stopOnMatch;
    if (input.position !== undefined) data.position = input.position;
    if (input.lockSeconds !== undefined) data.lockSeconds = input.lockSeconds;
    if (input.note !== undefined) data.note = input.note;
    try {
      return await this.write(id, input.version, data);
    } catch (error) {
      throw this.duplicate(error);
    }
  }

  async setEnabled(id: string, enabled: boolean, version: number) {
    return this.write(id, version, {
      enabled,
      version: { increment: 1 },
    });
  }

  async remove(id: string, version: number) {
    const result = await this.table().deleteMany({ where: { id, version } });
    if (result.count) return { id };
    throw (await this.table().findUnique({ where: { id } }))
      ? new ConflictException("Quy tắc đã thay đổi. Tải lại rồi thử tiếp.")
      : new NotFoundException("Không tìm thấy quy tắc này.");
  }

  async recordRun(input: {
    ruleId: string;
    ruleName: string;
    entity: string;
    entityId: string;
    code: string;
    trigger: string;
    outcome: "APPLIED" | "SKIPPED" | "FAILED";
    reason: string;
    actions: AppliedAction[];
  }) {
    const row = await this.db.automationRun.create({
      data: {
        ...input,
        actions: input.actions.length ? JSON.stringify(input.actions) : "",
      },
    });
    return this.runDto(row);
  }

  /** Bumps the counters a rule carries, without touching its version. */
  async touch(id: string) {
    await this.table().update({
      where: { id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  }

  async runs(query: RunsQuery) {
    const rows = await this.db.automationRun.findMany({
      where: {
        ...(query.ruleId ? { ruleId: query.ruleId } : {}),
        ...(query.outcome ? { outcome: query.outcome } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit,
    });
    return { items: rows.map((row) => this.runDto(row)) };
  }

  private async write(
    id: string,
    version: number,
    data: Prisma.AutomationRuleUpdateManyMutationInput,
  ) {
    const result = await this.table().updateMany({
      where: { id, version },
      data,
    });
    if (!result.count)
      throw (await this.table().findUnique({ where: { id } }))
        ? new ConflictException("Quy tắc đã thay đổi. Tải lại rồi thử tiếp.")
        : new NotFoundException("Không tìm thấy quy tắc này.");
    const row = await this.table().findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy quy tắc này.");
    return this.dto(row);
  }

  private duplicate(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return new ConflictException("Tên quy tắc đã tồn tại.");
    return error;
  }
}
