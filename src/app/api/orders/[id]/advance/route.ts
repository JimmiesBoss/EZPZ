import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOperator } from "@/lib/roles";
import { audit } from "@/lib/audit";
import {
  canTransitionFulfillment,
  canTransitionRequest,
  type FulfillmentStatus,
  type RequestStatus,
} from "@/lib/stateMachine";
import { onDelivered } from "@/lib/escrow";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireOperator();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const target: FulfillmentStatus = body.target;
  const trackingNumber: string | undefined = body.trackingNumber;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { request: true },
  });
  if (!order) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const from = order.fulfillmentStatus as FulfillmentStatus;
  if (!canTransitionFulfillment(from, target))
    return NextResponse.json({ error: "INVALID_TRANSITION" }, { status: 409 });

  const timeline = safeArr(order.timeline);
  timeline.push({ at: new Date().toISOString(), event: `FULFILLMENT_${target}`, actorId: user.id });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      fulfillmentStatus: target,
      trackingNumber: trackingNumber ?? order.trackingNumber,
      timeline: JSON.stringify(timeline),
    },
  });

  // Mirror the request status where it makes sense.
  const reqFrom = order.request.status as RequestStatus;
  if (target === "IN_TRANSIT" && canTransitionRequest(reqFrom, "SHIPPED")) {
    await prisma.partsRequest.update({
      where: { id: order.requestId },
      data: { status: "SHIPPED" },
    });
  }
  if (target === "DELIVERED") {
    if (canTransitionRequest(order.request.status as RequestStatus, "DELIVERED")) {
      await prisma.partsRequest.update({
        where: { id: order.requestId },
        data: { status: "DELIVERED" },
      });
    }
    await onDelivered(order.id, user.id);
  }

  await audit({
    event: "ORDER_ADVANCED",
    actorId: user.id,
    orderId: order.id,
    requestId: order.requestId,
    metadata: { from, to: target, trackingNumber: trackingNumber ?? null },
  });

  return NextResponse.json({ ok: true, status: target });
}

function safeArr(s: string): { at: string; event: string; actorId?: string }[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
