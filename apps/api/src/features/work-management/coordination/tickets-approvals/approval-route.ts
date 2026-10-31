/** Default approval chains; a request owner never edits these, the engine owns them. */
export interface RouteStep {
  name: string;
  quorum: Quorum;
  slaHours: number;
}

export type Quorum = "ANY" | "ALL" | "MAJORITY";
export type SlaState = "ON_TRACK" | "DUE_SOON" | "OVERDUE";

const HOUR = 60 * 60 * 1000;
const PAYMENT_STEPS: RouteStep[] = [
  { name: "Quản lý trực tiếp", quorum: "ANY", slaHours: 8 },
  { name: "Kiểm soát tài chính", quorum: "ANY", slaHours: 4 },
];
const PURCHASE_STEPS: RouteStep[] = [
  { name: "Quản lý trực tiếp", quorum: "ANY", slaHours: 8 },
  { name: "Ban mua sắm", quorum: "ANY", slaHours: 16 },
];
const MANAGER_STEP: RouteStep[] = [
  { name: "Quản lý trực tiếp", quorum: "ANY", slaHours: 24 },
];
/** Above this amount a purchase needs a second, independent gate. */
export const PURCHASE_ESCALATION_AMOUNT = 10_000_000;

/**
 * Money leaves the company through payment requests, so they always take two
 * gates; purchases only when they are big enough to matter.
 */
export function routeFor(fields: {
  category?: string;
  amount?: number;
}): RouteStep[] {
  const amount = fields.amount ?? 0;
  if (fields.category === "Thanh toán") return PAYMENT_STEPS;
  if (fields.category === "Mua sắm")
    return amount >= PURCHASE_ESCALATION_AMOUNT ? PURCHASE_STEPS : MANAGER_STEP;
  return MANAGER_STEP;
}

export function slaState(
  dueAt: Date,
  slaHours: number,
  now = new Date(),
): { state: SlaState; remainingMinutes: number } {
  const remainingMinutes = Math.ceil((dueAt.getTime() - now.getTime()) / 60000);
  if (remainingMinutes <= 0) return { state: "OVERDUE", remainingMinutes };
  const window = slaHours * 60;
  const soon = Math.max(window * 0.2, 30);
  return {
    state: remainingMinutes <= soon ? "DUE_SOON" : "ON_TRACK",
    remainingMinutes,
  };
}

export function dueFrom(start: Date, slaHours: number) {
  return new Date(start.getTime() + slaHours * HOUR);
}
