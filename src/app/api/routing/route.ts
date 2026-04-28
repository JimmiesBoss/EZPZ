import { NextRequest, NextResponse } from "next/server";
import { routeSearch } from "@/lib/routing";
import { CATEGORIES } from "@/lib/categories";
import { getSessionUser } from "@/lib/roles";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text : "";
  const supportEmail = process.env.SUPPORT_EMAIL ?? "support@widgeter.example";

  const decision = routeSearch(text, supportEmail);

  const enrich = (primaryId: string, subId?: string) => {
    const cat = CATEGORIES.find((c) => c.id === primaryId);
    const sub = subId ? cat?.subcategories.find((s) => s.id === subId) : undefined;
    return { primary: { id: primaryId, label: cat?.label ?? primaryId }, sub: sub ? { id: sub.id, label: sub.label } : null };
  };

  if (decision.mode === "exact") {
    return NextResponse.json({ ...decision, ...enrich(decision.primary, decision.sub) });
  }
  if (decision.mode === "partial") {
    return NextResponse.json({
      ...decision,
      candidates: decision.candidates.map((c) => ({ ...c, ...enrich(c.primary, c.sub) })),
    });
  }
  return NextResponse.json(decision);
}
