import { NextRequest, NextResponse } from "next/server";
import { requireOperator } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { dispatchSearch } from "@/lib/search";
import { audit } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireOperator();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const request = await prisma.partsRequest.findUnique({ where: { id: params.id } });
  if (!request) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.partsRequest.update({
    where: { id: request.id },
    data: { status: "SEARCHING" },
  });
  void dispatchSearch(request.id);
  await audit({ event: "SEARCH_REDISPATCHED", actorId: user.id, requestId: request.id });
  return NextResponse.json({ ok: true });
}
