import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/roles";
import { verify } from "@/lib/escrow";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireBuyer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { request: true },
  });
  if (!order) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (order.request.buyerId !== user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    await verify(order.id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "VERIFY_FAILED" },
      { status: 409 }
    );
  }
}
