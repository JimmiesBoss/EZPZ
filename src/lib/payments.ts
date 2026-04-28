import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function authorize(
  requestId: string,
  totalCents: number,
  actorId?: string
) {
  const authId = `auth_${randomUUID()}`;
  await prisma.partsRequest.update({
    where: { id: requestId },
    data: { paymentAuthId: authId },
  });
  await audit({
    event: "PAYMENT_AUTHORIZED",
    actorId,
    requestId,
    metadata: { authId, totalCents },
  });
  return { authId };
}

export async function captureFee(orderId: string, actorId?: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "CAPTURED" },
  });
  await audit({ event: "PAYMENT_FEE_CAPTURED", actorId, orderId });
}

export async function captureRemainder(orderId: string, actorId?: string) {
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "CAPTURED" },
  });
  await audit({ event: "PAYMENT_REMAINDER_CAPTURED", actorId, orderId });
}

export async function refundRemainder(
  orderId: string,
  reason: string,
  actorId?: string
) {
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "REFUNDED" },
  });
  await audit({ event: "PAYMENT_REFUNDED", actorId, orderId, metadata: { reason } });
}
