import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import {
  WORKFLOW_FIELDS,
  WorkflowEvents,
  type WorkflowAction,
  type WorkflowSnapshot,
} from "../../../../core/events/workflow-events.js";
import { compile, evaluate, valuesOf } from "./rule-engine.js";
import { WorkflowRulesRepository } from "./workflow-rules.repository.js";
import type {
  RuleDto,
  RuleInput,
  RulePatch,
  RunsQuery,
  SimulateInput,
  Simulation,
} from "./dto/workflow-rules.dto.js";

const reason = (error: unknown) =>
  error instanceof Error
    ? error.message.slice(0, 500)
    : String(error).slice(0, 500);

/**
 * The workflow engine: it listens to snapshots published by the owning feature,
 * evaluates the enabled rules in order and publishes the compiled actions back
 * on the same bus. Records it touches are locked for a few seconds so an action
 * that changes the record cannot start another round of the same automation.
 */
@Injectable()
export class WorkflowRulesService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRulesService.name);
  private readonly locks = new Map<string, number>();

  constructor(
    private readonly repository: WorkflowRulesRepository,
    private readonly events: WorkflowEvents,
  ) {}

  onModuleInit() {
    this.events.subscribeTriggers((snapshot) => {
      void this.run(snapshot).catch((error: unknown) => {
        this.logger.error(
          "Không chạy được quy tắc tự động",
          error instanceof Error ? error.stack : String(error),
        );
      });
    });
  }

  rules() {
    return this.repository.list();
  }

  create(input: RuleInput) {
    return this.repository.create(input);
  }

  update(id: string, input: RulePatch) {
    return this.repository.update(id, input);
  }

  toggle(id: string, enabled: boolean, version: number) {
    return this.repository.setEnabled(id, enabled, version);
  }

  remove(id: string, version: number) {
    return this.repository.remove(id, version);
  }

  runs(query: RunsQuery) {
    return this.repository.runs(query);
  }

  /** Dry run: every rule is reported, including the ones that do not match. */
  async simulate(input: SimulateInput): Promise<Simulation> {
    const snapshot = this.sample(input);
    const { items } = await this.repository.list();
    const results = items.map((rule) => {
      const verdict = evaluate(rule, snapshot, input.trigger);
      return {
        ruleId: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        matched: verdict.matched,
        reason: verdict.reason,
        actions: verdict.matched ? compile(rule.actions, snapshot) : [],
      };
    });
    return {
      trigger: input.trigger,
      results,
      matched: results.filter((result) => result.matched).length,
    };
  }

  /** Evaluates the enabled rules of one snapshot and dispatches their actions. */
  private async run(snapshot: WorkflowSnapshot) {
    if ((this.locks.get(snapshot.id) ?? 0) > Date.now()) return;
    const trigger = snapshot.previous ? "updated" : "created";
    for (const rule of await this.repository.enabled(snapshot.entity)) {
      const verdict = evaluate(rule, snapshot, trigger);
      if (!verdict.matched) continue;
      try {
        await this.apply(rule, snapshot, verdict.reason);
      } catch (error) {
        await this.repository.recordRun({
          ruleId: rule.id,
          ruleName: rule.name,
          entity: snapshot.entity,
          entityId: snapshot.id,
          code: snapshot.code,
          trigger,
          outcome: "FAILED",
          reason: reason(error),
          actions: [],
        });
      }
      if (rule.stopOnMatch) break;
    }
  }

  private async apply(
    rule: RuleDto,
    snapshot: WorkflowSnapshot,
    matched: string,
  ) {
    const actions = compile(rule.actions, snapshot);
    if (!rule.actions.length || !actions.length) {
      await this.repository.recordRun({
        ruleId: rule.id,
        ruleName: rule.name,
        entity: snapshot.entity,
        entityId: snapshot.id,
        code: snapshot.code,
        trigger: snapshot.previous ? "updated" : "created",
        outcome: "SKIPPED",
        reason: "Quy tắc không có hành động",
        actions: [],
      });
      return;
    }
    // Lock first: an applied action writes the record and publishes another
    // snapshot, which must not start this automation again.
    if (rule.lockSeconds)
      this.locks.set(snapshot.id, Date.now() + rule.lockSeconds * 1000);
    const run = await this.repository.recordRun({
      ruleId: rule.id,
      ruleName: rule.name,
      entity: snapshot.entity,
      entityId: snapshot.id,
      code: snapshot.code,
      trigger: snapshot.previous ? "updated" : "created",
      outcome: "APPLIED",
      reason: matched,
      actions,
    });
    await this.repository.touch(rule.id);
    const dispatched: WorkflowAction[] = actions.map((action) => ({
      ...action,
      entityId: snapshot.id,
    }));
    this.events.emitActions({
      runId: run.id,
      rule: rule.name,
      entity: snapshot.entity,
      entityId: snapshot.id,
      code: snapshot.code,
      actions: dispatched,
    });
  }

  /** Builds the snapshot a dry run evaluates; `changed` fields were different. */
  private sample(input: SimulateInput): WorkflowSnapshot {
    const values = valuesOf({
      entity: "task",
      id: "00000000-0000-0000-0000-000000000000",
      ...input.values,
    });
    if (input.trigger === "created")
      return {
        entity: "task",
        id: "00000000-0000-0000-0000-000000000000",
        ...values,
      };
    const previous: Record<string, string> = {};
    for (const field of WORKFLOW_FIELDS)
      previous[field] = input.changed.includes(field) ? "" : values[field];
    return {
      entity: "task",
      id: "00000000-0000-0000-0000-000000000000",
      ...values,
      previous,
    };
  }
}
