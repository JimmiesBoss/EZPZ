import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canTransitionEscrow, type EscrowState } from "@/lib/stateMachine";
import { captureRemainder, refundRemainder } from "@/lib/payments";

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
const NET_30 = 30 * 24 * 60 * 60 * 1000;

export async function onDelivered(orderId: string, actorId?: string) {
  const now = new Date();
  await prisma.order.update({
    where: { id: orderId },
    data: {
      escrowState: "HELD",
      buyerVerificationDeadline: new Date(now.getTime() + FOURTEEN_DAYS),
    },
  });
  await audit({ event: "ESCROW_HELD_ON_DELIVERY", actorId, orderId });
}

export async function verify(orderId: string, byUserId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!canTransitionEscrow(order.escrowState as EscrowState, "BUYER_VERIFIED"))
    throw new Error("INVALID_ESCROW_TRANSITION");

  const sellerPayoutReleaseAt = new Date(Date.now() + NET_30);
  await prisma.order.update({
    where: { id: orderId },
    data: { escrowState: "BUYER_VERIFIED", sellerPayoutReleaseAt },
  });
  await captureRemainder(orderId, byUserId);
  await audit({ event: "ESCROW_BUYER_VERIFIED", actorId: byUserId, orderId });
}

export async function dispute(orderId: string, byUserId: string, reason: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!canTransitionEscrow(order.escrowState as EscrowState, "DISPUTED"))
    throw new Error("INVALID_ESCROW_TRANSITION");
  await prisma.order.update({
    where: { id: orderId },
    data: { escrowState: "DISPUTED", notes: reason },
  });
  await audit({ event: "ESCROW_DISPUTED", actorId: byUserId, orderId, metadata: { reason } });
}

export async function resolveDispute(
  orderId: string,
  resolution: "REFUND" | "RELEASE",
  byUserId: string
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (resolution === "REFUND") {
    await refundRemainder(orderId, "operator dispute resolution", byUserId);
    await prisma.order.update({
      where: { id: orderId },
      data: { escrowState: "REFUNDED" },
    });
    await audit({ event: "ESCROW_REFUNDED", actorId: byUserId, orderId });
  } else {
    await captureRemainder(orderId, byUserId);
    await prisma.order.update({
      where: { id: orderId },
      data: {
        escrowState: "BUYER_VERIFIED",
        sellerPayoutReleaseAt: new Date(Date.now() + NET_30),
      },
    });
    await audit({ event: "ESCROW_OVERRIDE_VERIFIED", actorId: byUserId, orderId });
  }
}

export async function releasePayout(orderId: string, byUserId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (!canTransitionEscrow(order.escrowState as EscrowState, "SELLER_PAID"))
    throw new Error("INVALID_ESCROW_TRANSITION");
  if (
    order.sellerPayoutReleaseAt &&
    order.sellerPayoutReleaseAt.getTime() > Date.now()
  )
    throw new Error("PAYOUT_NOT_DUE");
  await prisma.order.update({
    where: { id: orderId },
    data: { escrowState: "SELLER_PAID" },
  });
  await audit({ event: "ESCROW_SELLER_PAID", actorId: byUserId, orderId });
}

export async function fastForwardClock(orderId: string, byUserId: string) {
  const past = new Date(Date.now() - 60 * 1000);
  await prisma.order.update({
    where: { id: orderId },
    data: { buyerVerificationDeadline: past, sellerPayoutReleaseAt: past },
  });
  await audit({ event: "ESCROW_FAST_FORWARD", actorId: byUserId, orderId });
}
