import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperator } from "@/lib/roles";
import { fastForwardClock } from "@/lib/escrow";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireOperator();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await fastForwardClock(order.id, user.id);
  return NextResponse.json({ ok: true });
}
