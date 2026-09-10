import { afterEach, describe, expect, it } from "vitest";
import os from "os";
import path from "path";
import { closeDb } from "./sqlite";
import {
  activatePlan,
  addExtraPacks,
  assertTalkAllowed,
  BillingError,
  billingSnapshot,
  consumeTalk,
  refundTalk,
  shanghaiMonthKey,
} from "./billing";

const prevSqlite = process.env.DUAER_SQLITE;
const prevUnlock = process.env.BILLING_UNLOCK;

function isolate() {
  process.env.DUAER_SQLITE = path.join(
    os.tmpdir(),
    `duaer-billing-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`,
  );
  process.env.BILLING_UNLOCK = "";
  closeDb();
}

afterEach(() => {
  closeDb();
  if (prevSqlite === undefined) delete process.env.DUAER_SQLITE;
  else process.env.DUAER_SQLITE = prevSqlite;
  if (prevUnlock === undefined) delete process.env.BILLING_UNLOCK;
  else process.env.BILLING_UNLOCK = prevUnlock;
});

describe("talk billing", () => {
  it("gives trial two talks then blocks the third", () => {
    isolate();
    const now = new Date("2026-09-10T02:00:00.000Z");
    expect(billingSnapshot(now).remaining).toBe(2);
    consumeTalk("p1", now);
    consumeTalk("p2", now);
    expect(billingSnapshot(now).remaining).toBe(0);
    expect(() => consumeTalk("p3", now)).toThrow(BillingError);
    try {
      consumeTalk("p3", now);
    } catch (err) {
      expect(err).toBeInstanceOf(BillingError);
      expect((err as BillingError).status).toBe(402);
    }
  });

  it("does not double-charge the same talk", () => {
    isolate();
    const now = new Date("2026-09-10T02:00:00.000Z");
    consumeTalk("p1", now);
    consumeTalk("p1", now);
    expect(billingSnapshot(now).remaining).toBe(1);
  });

  it("refunds a failed create", () => {
    isolate();
    const now = new Date("2026-09-10T02:00:00.000Z");
    consumeTalk("p1", now);
    refundTalk("p1", now);
    expect(billingSnapshot(now).remaining).toBe(2);
  });

  it("resets monthly uses and keeps extra credits", () => {
    isolate();
    const august = new Date("2026-08-15T04:00:00.000Z");
    consumeTalk("a1", august);
    consumeTalk("a2", august);
    addExtraPacks(10, august);
    expect(billingSnapshot(august).remaining).toBe(10);
    const september = new Date("2026-09-01T04:00:00.000Z");
    const snap = billingSnapshot(september);
    expect(snap.periodKey).toBe(shanghaiMonthKey(september));
    expect(snap.remaining).toBe(12);
    expect(snap.extra).toBe(10);
  });

  it("lets extra talks run after the plan quota", () => {
    isolate();
    const now = new Date("2026-09-10T02:00:00.000Z");
    consumeTalk("p1", now);
    consumeTalk("p2", now);
    addExtraPacks(10, now);
    consumeTalk("p3", now);
    const snap = billingSnapshot(now);
    expect(snap.remaining).toBe(9);
    expect(snap.extra).toBe(9);
  });

  it("refunds an extra talk back into extra", () => {
    isolate();
    const now = new Date("2026-09-10T02:00:00.000Z");
    consumeTalk("p1", now);
    consumeTalk("p2", now);
    addExtraPacks(10, now);
    consumeTalk("p3", now);
    refundTalk("p3", now);
    expect(billingSnapshot(now).extra).toBe(10);
    expect(billingSnapshot(now).remaining).toBe(10);
  });

  it("upgrades leftover trial uses into the paid quota", () => {
    isolate();
    const now = new Date("2026-09-10T02:00:00.000Z");
    consumeTalk("p1", now);
    const snap = activatePlan("talk", "month", now);
    expect(snap.planId).toBe("talk");
    expect(snap.remaining).toBe(19);
  });

  it("blocks 4K until daily is active", () => {
    isolate();
    const now = new Date("2026-09-10T02:00:00.000Z");
    expect(() => assertTalkAllowed("4K", now)).toThrow(/4K/);
    activatePlan("talk", "month", now);
    expect(() => assertTalkAllowed("4K", now)).toThrow(BillingError);
    activatePlan("daily", "month", now);
    expect(assertTalkAllowed("4K", now).allows4K).toBe(true);
  });

  it("unlocks 4K in the snapshot when billing is unlocked", () => {
    isolate();
    process.env.BILLING_UNLOCK = "1";
    const now = new Date("2026-09-10T02:00:00.000Z");
    expect(billingSnapshot(now).allows4K).toBe(true);
    expect(assertTalkAllowed("4K", now).allows4K).toBe(true);
  });

  it("falls back to trial when a paid month lapses", () => {
    isolate();
    const start = new Date("2026-07-01T00:00:00.000Z");
    activatePlan("talk", "month", start);
    const later = new Date("2026-08-05T00:00:00.000Z");
    const snap = billingSnapshot(later);
    expect(snap.planId).toBe("trial");
    expect(snap.quota).toBe(2);
  });

  it("keeps a yearly plan past thirty days", () => {
    isolate();
    const start = new Date("2026-07-01T00:00:00.000Z");
    activatePlan("daily", "year", start);
    const later = new Date("2026-08-05T00:00:00.000Z");
    expect(billingSnapshot(later).planId).toBe("daily");
  });
});
