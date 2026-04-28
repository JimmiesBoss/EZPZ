import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { saveAudio, MAX_AUDIO_BYTES } from "@/lib/storage";
import { transcribeAudio } from "@/lib/whisper";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });

  const file = form.get("audio");
  if (!(file instanceof File)) return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES)
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });

  const mediaType = file.type || "audio/webm";
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveAudio(buffer, mediaType);

  let transcript = "";
  try {
    transcript = await transcribeAudio(buffer, mediaType);
  } catch (err) {
    console.error("Whisper failed:", err);
  }

  return NextResponse.json({ id: saved.id, audioUrl: saved.url, transcript });
}
