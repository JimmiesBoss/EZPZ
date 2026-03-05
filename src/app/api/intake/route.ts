import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveAudioFile } from "@/lib/storage";
import { transcribeAudio } from "@/lib/whisper";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  // Handle JSON (text input)
  if (contentType.includes("application/json")) {
    const body = await req.json();
    const { sourceType, rawText } = body;

    if (!sourceType || !rawText) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const intake = await prisma.intake.create({
      data: {
        sourceType,
        rawText,
        submitterId: session.user.id,
        targetOwnerId: session.user.id,
      },
    });

    // TODO: Phase 3 — trigger Claude parsing here
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

  // Handle multipart (voice input)
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    // Save audio to local filesystem
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const ext = audioFile.type.includes("webm") ? "webm" : "mp4";
    const audioUrl = await saveAudioFile(audioBuffer, ext);

    // Transcribe via Whisper
    let transcript: string;
    try {
      transcript = await transcribeAudio(audioBuffer, ext);
    } catch (err) {
      console.error("Transcription failed:", err);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 502 }
      );
    }

    const intake = await prisma.intake.create({
      data: {
        sourceType: "VOICE",
        rawText: transcript,
        audioUrl,
        transcript,
        submitterId: session.user.id,
        targetOwnerId: session.user.id,
      },
    });

    // TODO: Phase 3 — trigger Claude parsing here
    const actionItem = await prisma.actionItem.create({
      data: {
        intakeId: intake.id,
        actionType: "TASK",
        status: "NEEDS_INFO",
        extractedFields: JSON.stringify({
          summary: transcript.slice(0, 100),
        }),
      },
    });

    return NextResponse.json({ intake, actionItem }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
}
