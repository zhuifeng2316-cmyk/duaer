"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./plans.module.css";

type PlanId = "trial" | "talk" | "daily";
type PlanCycle = "month" | "year";

type BillingSnapshot = {
  planId: PlanId;
  planName: string;
  cycle: PlanCycle;
  quota: number;
  extra: number;
  used: number;
  remaining: number;
  allows4K: boolean;
  catalog: {
    id: PlanId;
    name: string;
    monthlyYuan: number;
    yearlyYuan: number;
    quota: number;
    allows4K: boolean;
    blurb: string;
    featured: boolean;
  }[];
  extraPack: { count: number; priceYuan: number };
  note: string;
};

export default function PlansPage() {
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [cycle, setCycle] = useState<PlanCycle>("month");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/billing", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setBilling(data);
      else setError(data.error || "套餐打不开");
    })();
  }, []);

  async function post(body: object, key: string) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "没开通成");
      setBilling(data);
      window.dispatchEvent(new Event("duaer-billing"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "没开通成");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>套餐</p>
      <h1 className={styles.title}>按条做知识和情感口播</h1>
      <p className={styles.lede}>
        先写文案扣一条。试做听味道，开讲是给人讲的量，日更留给要天天出的人。
      </p>
      {billing && (
        <p className={styles.now}>
          当前 {billing.planName} · 本月还剩 {billing.remaining} 条
          {billing.extra > 0 ? ` · 其中加条 ${billing.extra}` : ""}
        </p>
      )}

      {billing ? null : !error ? <p className={styles.lede}>正在打开套餐…</p> : null}

      <div className={styles.cycles} role="group" aria-label="付费周期">
        <button
          type="button"
          className={cycle === "month" ? `${styles.cycle} ${styles.on}` : styles.cycle}
          onClick={() => setCycle("month")}
        >
          月付
        </button>
        <button
          type="button"
          className={cycle === "year" ? `${styles.cycle} ${styles.on}` : styles.cycle}
          onClick={() => setCycle("year")}
        >
          年付 · 按十个月
        </button>
      </div>

      <div className={styles.grid}>
        {(billing?.catalog || []).map((row) => {
          const current = billing?.planId === row.id;
          const price =
            row.monthlyYuan === 0
              ? "免费"
              : cycle === "year"
                ? `${row.yearlyYuan} 元 / 年`
                : `${row.monthlyYuan} 元 / 月`;
          return (
            <article className={row.featured ? `${styles.card} ${styles.featured}` : styles.card} key={row.id}>
              <b>
                {row.name}
                {row.featured ? " · 主推" : ""}
              </b>
              <strong>{price}</strong>
              <span>{row.blurb}</span>
              <button
                type="button"
                className={styles.go}
                disabled={current || Boolean(busy)}
                onClick={() => void post({ action: "activate", planId: row.id, cycle }, row.id)}
              >
                {current ? "已开通" : busy === row.id ? "正在开通…" : `开通${row.name}`}
              </button>
            </article>
          );
        })}
      </div>

      {billing && (
        <div className={styles.extra}>
          <div>
            <b>加条</b>
            <p>
              {billing.extraPack.priceYuan} 元买 {billing.extraPack.count} 条，合 9 元一条。套餐额度用完也能做，跨月还在。
            </p>
          </div>
          <button
            type="button"
            className={styles.go}
            disabled={Boolean(busy)}
            onClick={() => void post({ action: "extra", count: billing.extraPack.count }, "extra")}
          >
            {busy === "extra" ? "正在加买…" : `加买 ${billing.extraPack.count} 条`}
          </button>
        </div>
      )}

      {error && <p className={styles.err}>{error}</p>}
      <p className={styles.note}>{billing?.note || "支付随后开，开通先记账。"}</p>
      <p className={styles.back}>
        <Link href="/">回去开始做</Link>
      </p>
    </div>
  );
}
