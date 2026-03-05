import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  const item = await prisma.actionItem.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updatedItem = await prisma.actionItem.update({
    where: { id: params.id },
    data: {
      status: status === "executed" ? "DONE" : item.status,
      executionArtifacts: artifacts ? JSON.stringify(artifacts) : item.executionArtifacts,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actionItemId: params.id,
      event: "ELVIS_CALLBACK",
      metadata: JSON.stringify(body),
    },
  });

  return NextResponse.json(updatedItem);
}
