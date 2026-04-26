import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import {
  saveImage,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/lib/storage";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });

  const mediaType = file.type || "image/jpeg";
  if (!ALLOWED_IMAGE_TYPES.has(mediaType))
    return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });
  if (file.size > MAX_IMAGE_BYTES)
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveImage(buffer, mediaType);
  return NextResponse.json({ id: saved.id, url: saved.url, mediaType });
}
