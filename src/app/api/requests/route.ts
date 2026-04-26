import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/roles";
import { getCategory, getSubcategory } from "@/lib/categories";
import { getWaiverForCategory } from "@/lib/waivers";
import { parsePartsRequest } from "@/lib/claude";
import { audit } from "@/lib/audit";
import { IMAGE_DIR } from "@/lib/storage";

async function loadImageBase64(url: string) {
  const filename = url.split("/").pop();
  if (!filename) return null;
  const safe = path.basename(filename);
  const fullPath = path.join(IMAGE_DIR, safe);
  try {
    const data = await fs.readFile(fullPath);
    const ext = safe.split(".").pop()?.toLowerCase();
    const mediaType =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : ext === "heic"
            ? "image/heic"
            : "image/jpeg";
    return { mediaType, data: data.toString("base64") };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireBuyer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const {
    primaryCategory,
    subCategory,
    title,
    description,
    budgetCents,
    waiverAccepted,
    imageUrls,
    audioUrl,
    transcript,
  } = body as {
    primaryCategory?: string;
    subCategory?: string;
    title?: string;
    description?: string;
    budgetCents?: number;
    waiverAccepted?: boolean;
    imageUrls?: string[];
    audioUrl?: string;
    transcript?: string;
  };

  const cat = primaryCategory ? getCategory(primaryCategory) : undefined;
  if (!cat) return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
  const sub = subCategory ? getSubcategory(cat.id, subCategory) : undefined;
  if (!title?.trim()) return NextResponse.json({ error: "MISSING_TITLE" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "MISSING_DESCRIPTION" }, { status: 400 });
  if (!budgetCents || budgetCents < 100)
    return NextResponse.json({ error: "INVALID_BUDGET" }, { status: 400 });
  if (!waiverAccepted)
    return NextResponse.json({ error: "WAIVER_REQUIRED" }, { status: 400 });

  const waiver = getWaiverForCategory(cat.id);

  const imgList = Array.isArray(imageUrls) ? imageUrls.slice(0, 5) : [];
  const imageBase64 = (
    await Promise.all(imgList.map((u) => loadImageBase64(u)))
  ).filter((v): v is { mediaType: string; data: string } => v !== null);

  let parsed;
  try {
    parsed = await parsePartsRequest({
      primaryCategory: cat.id,
      subCategory: sub?.id,
      text: `${title}\n\n${description}`,
      imageBase64,
    });
  } catch (err) {
    parsed = {
      specs: { notes: description.slice(0, 500) },
      missingFields: ["details"],
      rejectionReasons: [],
      confidence: 0.2,
    };
    console.error("Claude parse failed:", err);
  }

  const isRejected = parsed.rejectionReasons.length > 0;
  const status = isRejected
    ? "REJECTED"
    : parsed.missingFields.length > 0
      ? "CLARIFYING"
      : "SEARCHING";

  const created = await prisma.partsRequest.create({
    data: {
      buyerId: user.id,
      primaryCategory: cat.id,
      subCategory: sub?.id ?? "",
      title,
      rawDescription: description,
      transcript: transcript || null,
      audioUrl: audioUrl || null,
      specs: JSON.stringify(parsed.specs),
      missingFields: JSON.stringify(parsed.missingFields),
      rejectionReasons: JSON.stringify(parsed.rejectionReasons),
      budgetCents,
      waiverVersion: waiver ? `${waiver.id}@${waiver.version}` : null,
      waiverAcceptedAt: new Date(),
      status,
      images: imgList.length
        ? {
            create: imgList.map((url) => ({ url })),
          }
        : undefined,
    },
  });

  await audit({
    event: "REQUEST_CREATED",
    actorId: user.id,
    requestId: created.id,
    metadata: {
      status,
      missingFields: parsed.missingFields,
      rejectionReasons: parsed.rejectionReasons,
      images: imgList.length,
      hasVoice: Boolean(transcript),
    },
  });

  if (status === "CLARIFYING") {
    for (const field of parsed.missingFields) {
      await prisma.clarificationMessage.create({
        data: {
          requestId: created.id,
          direction: "SYSTEM",
          content: `Could you tell me the ${field}?`,
        },
      });
    }
  }

  return NextResponse.json({ id: created.id, status });
}

export async function GET() {
  let user;
  try {
    user = await requireBuyer();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const requests = await prisma.partsRequest.findMany({
    where: user.role === "OPERATOR" ? {} : { buyerId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ requests });
}
