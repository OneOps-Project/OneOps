import { z } from "zod";
export const eventSchema = z.object({
  id: z.uuid(),
  module: z.string(),
  actorId: z.uuid(),
  actorName: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.uuid(),
  entityName: z.string(),
  result: z.enum(["SUCCESS", "FAILURE", "DENIED"]),
  createdAt: z.iso.datetime(),
});
export const detailSchema = eventSchema.extend({
  before: z.record(z.string(), z.json()).nullable(),
  after: z.record(z.string(), z.json()).nullable(),
});
export const eventsPageSchema = z.object({
  items: z.array(eventSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  summary: z.object({
    success: z.number().int(),
    failure: z.number().int(),
    denied: z.number().int(),
  }),
});
export const filtersSchema = z.object({
  modules: z.array(z.string()),
  actions: z.array(z.string()),
  entityTypes: z.array(z.string()),
});
export type AuditEvent = z.infer<typeof eventSchema>;
export type AuditDetail = z.infer<typeof detailSchema>;
export type EventsPage = z.infer<typeof eventsPageSchema>;
export type FilterOptions = z.infer<typeof filtersSchema>;
export type AuditFilters = {
  q: string;
  module: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  result: string;
  from: string;
  to: string;
};
export const emptyFilters: AuditFilters = {
  q: "",
  module: "",
  actor: "",
  action: "",
  entityType: "",
  entityId: "",
  result: "",
  from: "",
  to: "",
};
