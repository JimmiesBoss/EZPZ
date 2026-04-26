import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperator } from "@/lib/roles";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireOperator();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.hiddenFromBuyer === "boolean") data.hiddenFromBuyer = body.hiddenFromBuyer;
  if (typeof body.proofVideoUrl === "string") data.proofVideoUrl = body.proofVideoUrl;
  if (typeof body.priceCents === "number") data.priceCents = body.priceCents;
  if (typeof body.condition === "string") data.condition = body.condition;
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });

  const updated = await prisma.match.update({ where: { id: params.id }, data });
  await audit({
    event: "MATCH_PATCHED",
    actorId: user.id,
    matchId: updated.id,
    requestId: updated.requestId,
    metadata: data,
  });
  return NextResponse.json({ ok: true });
}
