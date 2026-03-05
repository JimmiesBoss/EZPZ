import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sourceType, rawText } = body;

  if (!sourceType || !rawText) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Find the owner (for MVP, submitter is also the owner)
  const intake = await prisma.intake.create({
    data: {
      sourceType,
      rawText,
      submitterId: session.user.id,
      targetOwnerId: session.user.id,
    },
  });

  // TODO: Phase 3 — trigger Claude parsing here
  // For now, create a placeholder action item
  const actionItem = await prisma.actionItem.create({
    data: {
      intakeId: intake.id,
      actionType: "TASK",
      status: "NEEDS_INFO",
      extractedFields: JSON.stringify({ summary: rawText.slice(0, 100) }),
    },
  });

  return NextResponse.json({ intake, actionItem }, { status: 201 });
}
