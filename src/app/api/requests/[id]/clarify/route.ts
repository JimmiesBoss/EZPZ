import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/roles";
import { mergeClarification } from "@/lib/claude";
import { audit } from "@/lib/audit";
import { canTransitionRequest, type RequestStatus } from "@/lib/stateMachine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let user;
  try {
    user = await requireBuyer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const answer: string | undefined = body?.answer;
  if (!answer?.trim()) return NextResponse.json({ error: "MISSING_ANSWER" }, { status: 400 });

  const request = await prisma.partsRequest.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!request) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (request.buyerId !== user.id && user.role !== "OPERATOR")
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const lastSystem = [...request.messages].reverse().find((m) => m.direction === "SYSTEM");
  const question = lastSystem?.content ?? "Anything else relevant?";

  const currentSpecs = JSON.parse(request.specs || "{}");

  let merged;
  try {
    merged = await mergeClarification({
      currentSpecs,
      question,
      answer,
      primaryCategory: request.primaryCategory,
      subCategory: request.subCategory || undefined,
    });
  } catch (err) {
    console.error("Flow B failed:", err);
    merged = { updatedSpecs: currentSpecs, stillMissing: [] };
  }

  await prisma.clarificationMessage.create({
    data: {
      requestId: request.id,
      direction: "USER",
      content: answer,
      answeredById: user.id,
    },
  });

  for (const field of merged.stillMissing) {
    await prisma.clarificationMessage.create({
      data: {
        requestId: request.id,
        direction: "SYSTEM",
        content: `Could you tell me the ${field}?`,
      },
    });
  }

  const nextStatus: RequestStatus =
    merged.stillMissing.length > 0 ? "CLARIFYING" : "SEARCHING";
  const fromStatus = request.status as RequestStatus;
  const finalStatus = canTransitionRequest(fromStatus, nextStatus)
    ? nextStatus
    : fromStatus;

  await prisma.partsRequest.update({
    where: { id: request.id },
    data: {
      specs: JSON.stringify(merged.updatedSpecs),
      missingFields: JSON.stringify(merged.stillMissing),
      status: finalStatus,
    },
  });

  await audit({
    event: "CLARIFICATION_ANSWERED",
    actorId: user.id,
    requestId: request.id,
    metadata: { stillMissing: merged.stillMissing, status: finalStatus },
  });

  return NextResponse.json({ status: finalStatus, stillMissing: merged.stillMissing });
}
