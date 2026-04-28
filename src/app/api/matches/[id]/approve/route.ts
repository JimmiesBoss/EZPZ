import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/roles";
import { authorize, captureFee } from "@/lib/payments";
import { audit } from "@/lib/audit";
import { canTransitionRequest, type RequestStatus } from "@/lib/stateMachine";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireBuyer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { request: true },
  });
  if (!match) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (match.request.buyerId !== user.id)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (match.request.status !== "AWAITING_REVIEW")
    return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });

  if (match.request.primaryCategory === "gaming" && !match.proofVideoUrl) {
    return NextResponse.json(
      { error: "GAMING_PROOF_REQUIRED", message: "Operator must attach a proof-of-functionality video before this match can be approved." },
      { status: 409 }
    );
  }

  const total = match.priceCents + match.shippingCents + match.request.serviceFeeCents;

  const { authId } = await authorize(match.requestId, total, user.id);

  // Mark this match BUYER_APPROVED, withdraw siblings.
  await prisma.match.update({
    where: { id: match.id },
    data: { status: "BUYER_APPROVED" },
  });
  await prisma.match.updateMany({
    where: { requestId: match.requestId, NOT: { id: match.id } },
    data: { status: "WITHDRAWN" },
  });

  const order = await prisma.order.create({
    data: {
      requestId: match.requestId,
      matchId: match.id,
      totalCents: total,
      paymentStatus: "AUTHORIZED",
      fulfillmentStatus: "PENDING",
      escrowState: "HELD",
      timeline: JSON.stringify([
        { at: new Date().toISOString(), event: "ORDER_CREATED", actorId: user.id },
      ]),
    },
  });

  await captureFee(order.id, user.id);

  const from = match.request.status as RequestStatus;
  if (canTransitionRequest(from, "APPROVED")) {
    await prisma.partsRequest.update({
      where: { id: match.requestId },
      data: { status: "APPROVED" },
    });
  }
  if (canTransitionRequest("APPROVED", "ACQUIRING")) {
    await prisma.partsRequest.update({
      where: { id: match.requestId },
      data: { status: "ACQUIRING" },
    });
  }

  await audit({
    event: "MATCH_APPROVED",
    actorId: user.id,
    requestId: match.requestId,
    matchId: match.id,
    orderId: order.id,
    metadata: { authId, totalCents: total },
  });

  return NextResponse.json({ orderId: order.id });
}
