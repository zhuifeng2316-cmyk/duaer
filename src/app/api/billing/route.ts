import { NextResponse } from "next/server";
import {
  activatePlan,
  addExtraPacks,
  BillingError,
  billingSnapshot,
  parsePlanCycle,
  parsePlanId,
} from "@/lib/billing";

export async function GET() {
  return NextResponse.json(billingSnapshot(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { action?: unknown; planId?: unknown; cycle?: unknown; count?: unknown }
      | null;
    const action = String(body?.action || "").trim();
    if (action === "activate") {
      const planId = parsePlanId(String(body?.planId || ""));
      if (!planId) {
        return NextResponse.json({ error: "先选一个套餐" }, { status: 400 });
      }
      const billing = activatePlan(planId, parsePlanCycle(String(body?.cycle || "")));
      return NextResponse.json(billing);
    }
    if (action === "extra") {
      const billing = addExtraPacks(Number(body?.count));
      return NextResponse.json(billing);
    }
    return NextResponse.json({ error: "先选开通还是加买" }, { status: 400 });
  } catch (e) {
    if (e instanceof BillingError) {
      return NextResponse.json({ error: e.message, code: e.code, billing: e.billing }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "开通失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
