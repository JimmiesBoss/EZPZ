import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Verify webhook secret
  const secret = process.env.ELVIS_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-webhook-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json();
  const { status, artifacts } = body;

  // Only allow callback on items currently IN_PROGRESS
  const item = await prisma.actionItem.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (item.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Action not in progress" },
      { status: 409 }
    );
  }

  const updatedItem = await prisma.actionItem.update({
    where: { id: params.id },
    data: {
      status: status === "executed" ? "DONE" : item.status,
      executionArtifacts: artifacts ? JSON.stringify(artifacts) : item.executionArtifacts,
    },
  });

  await auditLog("ELVIS_CALLBACK", {
    actionItemId: params.id,
    metadata: { elvisStatus: status, hasArtifacts: !!artifacts },
  });

  return NextResponse.json(updatedItem);
}
