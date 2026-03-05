import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatchToElvis } from "@/lib/elvis";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { answer } = await req.json();
  if (!answer) {
    return NextResponse.json({ error: "Missing answer" }, { status: 400 });
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

  // The field being answered is based on message pairing
  const missingFields: string[] = JSON.parse(actionItem.missingFields || "[]");
  const extracted: Record<string, unknown> = JSON.parse(
    actionItem.extractedFields || "{}"
  );

  // Map the answer to the next missing field
  const answeredIndex = userMessages.length; // this answer is the Nth user reply
  if (answeredIndex < missingFields.length) {
    const fieldName = missingFields[answeredIndex];
    extracted[fieldName] = answer;
  }

  // Check if all missing fields are now answered
  const remainingMissing = missingFields.slice(answeredIndex + 1);

  const updatedItem = await prisma.actionItem.update({
    where: { id: params.id },
    data: {
      extractedFields: JSON.stringify(extracted),
      missingFields: JSON.stringify(remainingMissing),
      status: remainingMissing.length === 0 ? "READY" : "NEEDS_INFO",
    },
    include: {
      clarificationMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  // Auto-dispatch to Elvis when all fields resolved
  if (remainingMissing.length === 0) {
    dispatchToElvis(params.id).catch((err) =>
      console.error("Elvis dispatch failed:", err)
    );
  }

  return NextResponse.json(updatedItem);
}
