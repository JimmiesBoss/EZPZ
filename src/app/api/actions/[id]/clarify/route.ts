import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatchToElvis } from "@/lib/elvis";
import { verifyActionOwnership, auditLog, safeJsonParse } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { answer } = await req.json();
  if (!answer || typeof answer !== "string" || answer.length > 2000) {
    return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  }

  const owned = await verifyActionOwnership(params.id, session.user.id);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const actionItem = await prisma.actionItem.findUnique({
    where: { id: params.id },
    include: {
      clarificationMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!actionItem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Save the user's answer
  await prisma.clarificationMessage.create({
    data: {
      actionItemId: params.id,
      direction: "USER",
      content: answer,
      answeredById: session.user.id,
    },
  });

  const userMessages = actionItem.clarificationMessages.filter(
    (m) => m.direction === "USER"
  );

  const missingFields: string[] = safeJsonParse(actionItem.missingFields, []);
  const extracted: Record<string, unknown> = safeJsonParse(
    actionItem.extractedFields, {}
  );

  // Map the answer to the next missing field
  const answeredIndex = userMessages.length;
  if (answeredIndex < missingFields.length) {
    const fieldName = missingFields[answeredIndex];
    extracted[fieldName] = answer;
  }

  const remainingMissing = missingFields.slice(answeredIndex + 1);
  const newStatus = remainingMissing.length === 0 ? "READY" : "NEEDS_INFO";

  const updatedItem = await prisma.actionItem.update({
    where: { id: params.id },
    data: {
      extractedFields: JSON.stringify(extracted),
      missingFields: JSON.stringify(remainingMissing),
      status: newStatus,
    },
    include: {
      clarificationMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  await auditLog("CLARIFICATION_ANSWERED", {
    actionItemId: params.id,
    actorId: session.user.id,
    metadata: { remainingMissing, newStatus },
  });

  // Auto-dispatch to Elvis when all fields resolved
  if (remainingMissing.length === 0) {
    dispatchToElvis(params.id).catch((err) =>
      console.error("Elvis dispatch failed:", err)
    );
  }

  return NextResponse.json(updatedItem);
}
