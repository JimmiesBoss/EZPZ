import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { readMedia } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { kind: string; filename: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const kind = params.kind === "audio" ? "audio" : params.kind === "images" ? "images" : null;
  if (!kind) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    const data = await readMedia(kind, params.filename);
    const ext = params.filename.split(".").pop()?.toLowerCase() ?? "";
    const mime =
      kind === "audio"
        ? ext === "mp3"
          ? "audio/mpeg"
          : "audio/webm"
        : ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": mime, "Cache-Control": "private, max-age=300" },
    });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}
