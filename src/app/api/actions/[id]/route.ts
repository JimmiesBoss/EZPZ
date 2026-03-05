import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const item = await prisma.actionItem.findUnique({
    where: { id: params.id },
    include: {
      intake: true,
      clarificationMessages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { status, extractedFields } = body;

  const data: Record<string, string> = {};
  if (status) data.status = status;
  if (extractedFields) data.extractedFields = JSON.stringify(extractedFields);

  const item = await prisma.actionItem.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(item);
}
