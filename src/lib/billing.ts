import { kvGet, kvSet } from "./sqlite";
import type { OutputQuality } from "./aspect";

export const PLAN_IDS = ["trial", "talk", "daily"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type PlanCycle = "month" | "year";

export const PLAN_CATALOG = [
  {
    id: "trial" as const,
    name: "试做",
    monthlyYuan: 0,
    yearlyYuan: 0,
    quota: 2,
    allows4K: false,
    blurb: "2 条 / 月 · 听文案、看成片",
    featured: false,
  },
  {
    id: "talk" as const,
    name: "开讲",
    monthlyYuan: 128,
    yearlyYuan: 1228,
    quota: 20,
    allows4K: false,
    blurb: "20 条 · 知识或情感 · 2K",
    featured: true,
  },
  {
    id: "daily" as const,
    name: "日更",
    monthlyYuan: 268,
    yearlyYuan: 2570,
    quota: 50,
    allows4K: true,
    blurb: "50 条 · 可开 4K",
    featured: false,
  },
] as const;

export const EXTRA_PACK = { count: 10, priceYuan: 90 } as const;

const KV_KEY = "studio_plan";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export type StoredPlan = {
  planId: PlanId;
  cycle: PlanCycle;
  activatedAt: string;
  extra: number;
  periodKey: string;
  usedIds: string[];
};

export type BillingSnapshot = {
  planId: PlanId;
  planName: string;
  cycle: PlanCycle;
  quota: number;
  extra: number;
  used: number;
  remaining: number;
  allows4K: boolean;
  expiresAt: string | null;
  periodKey: string;
  unlocked: boolean;
  catalog: typeof PLAN_CATALOG;
  extraPack: typeof EXTRA_PACK;
  note: string;
};

export class BillingError extends Error {
  status: number;
  code: "QUOTA" | "QUALITY" | "PLAN";
  billing: BillingSnapshot | null;

  constructor(message: string, status: number, code: BillingError["code"], billing: BillingSnapshot | null = null) {
    super(message);
    this.name = "BillingError";
    this.status = status;
    this.code = code;
    this.billing = billing;
  }
}

export function billingUnlocked(): boolean {
  return (process.env.BILLING_UNLOCK || "").trim() === "1";
}

export function shanghaiMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  return `${year}-${month}`;
}

export function parsePlanId(raw: string | null | undefined): PlanId | null {
  const v = (raw || "").trim();
  return PLAN_IDS.includes(v as PlanId) ? (v as PlanId) : null;
}

export function parsePlanCycle(raw: string | null | undefined): PlanCycle {
  return (raw || "").trim() === "year" ? "year" : "month";
}

function catalogRow(id: PlanId) {
  return PLAN_CATALOG.find((row) => row.id === id) || PLAN_CATALOG[0];
}

function emptyPlan(now: Date): StoredPlan {
  return {
    planId: "trial",
    cycle: "month",
    activatedAt: now.toISOString(),
    extra: 0,
    periodKey: shanghaiMonthKey(now),
    usedIds: [],
  };
}

function asPlanId(raw: unknown): PlanId {
  return parsePlanId(String(raw || "")) || "trial";
}

function readStored(): StoredPlan | null {
  const raw = kvGet(KV_KEY);
  if (!raw) return null;
  try {
    const row = JSON.parse(raw) as Partial<StoredPlan>;
    if (!row || typeof row !== "object") return null;
    return {
      planId: asPlanId(row.planId),
      cycle: row.cycle === "year" ? "year" : "month",
      activatedAt: String(row.activatedAt || "") || new Date().toISOString(),
      extra: Math.max(0, Math.floor(Number(row.extra) || 0)),
      periodKey: String(row.periodKey || ""),
      usedIds: Array.isArray(row.usedIds) ? row.usedIds.map(String).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

function writeStored(plan: StoredPlan): void {
  kvSet(KV_KEY, JSON.stringify(plan));
}

function expiresAtFor(plan: StoredPlan): string | null {
  if (plan.planId === "trial") return null;
  const start = Date.parse(plan.activatedAt);
  if (!Number.isFinite(start)) return null;
  const span = plan.cycle === "year" ? YEAR_MS : MONTH_MS;
  return new Date(start + span).toISOString();
}

function leftoverExtra(plan: StoredPlan): number {
  const quota = catalogRow(plan.planId).quota;
  return Math.max(0, plan.extra - Math.max(0, plan.usedIds.length - quota));
}

function remainingOf(plan: StoredPlan): number {
  const quota = catalogRow(plan.planId).quota;
  return Math.max(0, quota + plan.extra - plan.usedIds.length);
}

export function loadStudioPlan(now = new Date()): StoredPlan {
  const current = readStored() || emptyPlan(now);
  const next: StoredPlan = {
    ...current,
    extra: Math.max(0, current.extra),
    usedIds: [...current.usedIds],
  };
  const month = shanghaiMonthKey(now);
  if (next.periodKey !== month) {
    const quota = catalogRow(next.planId).quota;
    next.extra = Math.max(0, next.extra - Math.max(0, next.usedIds.length - quota));
    next.periodKey = month;
    next.usedIds = [];
  }
  const expiresAt = expiresAtFor(next);
  if (next.planId !== "trial" && expiresAt && now.getTime() > Date.parse(expiresAt)) {
    next.planId = "trial";
    next.cycle = "month";
    next.activatedAt = now.toISOString();
  }
  const before = readStored();
  if (
    !before ||
    before.planId !== next.planId ||
    before.cycle !== next.cycle ||
    before.activatedAt !== next.activatedAt ||
    before.extra !== next.extra ||
    before.periodKey !== next.periodKey ||
    before.usedIds.join("\n") !== next.usedIds.join("\n")
  ) {
    writeStored(next);
  }
  return next;
}

export function billingSnapshot(now = new Date()): BillingSnapshot {
  const plan = loadStudioPlan(now);
  const row = catalogRow(plan.planId);
  return {
    planId: plan.planId,
    planName: row.name,
    cycle: plan.cycle,
    quota: row.quota,
    extra: leftoverExtra(plan),
    used: plan.usedIds.length,
    remaining: remainingOf(plan),
    allows4K: row.allows4K || billingUnlocked(),
    expiresAt: expiresAtFor(plan),
    periodKey: plan.periodKey,
    unlocked: billingUnlocked(),
    catalog: PLAN_CATALOG,
    extraPack: EXTRA_PACK,
    note: "支付随后开，开通先记账。先写文案扣一条。",
  };
}

export function assertTalkAllowed(quality: OutputQuality, now = new Date()): BillingSnapshot {
  const snap = billingSnapshot(now);
  if (billingUnlocked()) return snap;
  if (quality === "4K" && !snap.allows4K) {
    throw new BillingError("4K 要日更套餐", 400, "QUALITY", snap);
  }
  if (snap.remaining <= 0) {
    throw new BillingError("本月条数用完了，去开通或加买加条", 402, "QUOTA", snap);
  }
  return snap;
}

export function consumeTalk(projectId: string, now = new Date()): BillingSnapshot {
  if (billingUnlocked()) return billingSnapshot(now);
  const id = String(projectId || "").trim();
  if (!id) throw new BillingError("口播还没建起来", 400, "PLAN", billingSnapshot(now));
  const plan = loadStudioPlan(now);
  if (plan.usedIds.includes(id)) return billingSnapshot(now);
  if (remainingOf(plan) <= 0) {
    throw new BillingError("本月条数用完了，去开通或加买加条", 402, "QUOTA", billingSnapshot(now));
  }
  plan.usedIds.push(id);
  writeStored(plan);
  return billingSnapshot(now);
}

export function refundTalk(projectId: string, now = new Date()): BillingSnapshot {
  if (billingUnlocked()) return billingSnapshot(now);
  const id = String(projectId || "").trim();
  const plan = loadStudioPlan(now);
  const index = plan.usedIds.indexOf(id);
  if (index < 0) return billingSnapshot(now);
  plan.usedIds.splice(index, 1);
  writeStored(plan);
  return billingSnapshot(now);
}

export function activatePlan(planId: PlanId, cycle: PlanCycle, now = new Date()): BillingSnapshot {
  const plan = loadStudioPlan(now);
  plan.planId = planId;
  plan.cycle = planId === "trial" ? "month" : cycle;
  plan.activatedAt = now.toISOString();
  writeStored(plan);
  return billingSnapshot(now);
}

export function addExtraPacks(count = EXTRA_PACK.count, now = new Date()): BillingSnapshot {
  const n = Math.floor(Number(count) || 0);
  if (n !== EXTRA_PACK.count) {
    throw new BillingError("加条一次买 10 条", 400, "PLAN", billingSnapshot(now));
  }
  const plan = loadStudioPlan(now);
  plan.extra += EXTRA_PACK.count;
  writeStored(plan);
  return billingSnapshot(now);
}
