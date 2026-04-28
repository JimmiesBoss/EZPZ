import { prisma } from "@/lib/prisma";

export interface AuditInput {
  event: string;
  actorId?: string;
  requestId?: string;
  matchId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

export async function audit(input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      event: input.event,
      actorId: input.actorId,
      requestId: input.requestId,
      matchId: input.matchId,
      orderId: input.orderId,
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
}
