import { prisma } from "./prisma";

/**
 * Verify that the given user owns the action item (via intake.targetOwnerId).
 * Returns the action item if authorized, null otherwise.
 */
export async function verifyActionOwnership(actionItemId: string, userId: string) {
  const item = await prisma.actionItem.findUnique({
    where: { id: actionItemId },
    include: { intake: { select: { targetOwnerId: true, submitterId: true } } },
  });

  if (!item) return null;
  if (item.intake.targetOwnerId !== userId && item.intake.submitterId !== userId) {
    return null;
  }
  return item;
}

/**
 * Log a state change or event on an action item.
 */
export async function auditLog(
  event: string,
  opts: {
    actionItemId?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  } = {}
) {
  await prisma.auditLog.create({
    data: {
      event,
      actionItemId: opts.actionItemId ?? null,
      actorId: opts.actorId ?? null,
      metadata: JSON.stringify(opts.metadata ?? {}),
    },
  });
}

/** Safely parse JSON with a fallback */
export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/** Valid status values */
export const VALID_STATUSES = ["NEEDS_INFO", "READY", "IN_PROGRESS", "DONE", "ARCHIVED"] as const;
export type ActionStatus = (typeof VALID_STATUSES)[number];

/** Max input sizes */
export const MAX_TEXT_LENGTH = 10000;
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)
