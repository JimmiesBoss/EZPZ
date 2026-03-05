import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveAudioFile } from "@/lib/storage";
import { transcribeAudio } from "@/lib/whisper";
import { parseIntake } from "@/lib/parser";
import { dispatchToElvis } from "@/lib/elvis";

async function createActionItems(intakeId: string, rawText: string) {
  try {
    const result = await parseIntake(rawText);
    const items = [];

    for (const action of result.actions) {
      const hasAllRequired = action.missingFields.length === 0;
      const item = await prisma.actionItem.create({
        data: {
          intakeId,
          actionType: action.actionType,
          status: hasAllRequired ? "READY" : "NEEDS_INFO",
          extractedFields: JSON.stringify(action.extractedFields),
          missingFields: JSON.stringify(action.missingFields),
          inferredFields: JSON.stringify(action.inferredFields),
        },
      });

      // If fields are missing, create clarification messages
      if (!hasAllRequired) {
        for (const field of action.missingFields) {
          await prisma.clarificationMessage.create({
            data: {
              actionItemId: item.id,
              direction: "SYSTEM",
              content: `What is the ${field.replace(/_/g, " ")} for this ${action.actionType.toLowerCase()}?`,
            },
          });
        }
      }

      // Auto-dispatch to Elvis if all fields present
      if (hasAllRequired) {
        dispatchToElvis(item.id).catch((err) =>
          console.error("Elvis dispatch failed:", err)
        );
      }

      items.push(item);
    }

    return items;
  } catch (err) {
    console.error("Parsing failed, creating fallback action item:", err);
    // Fallback: create a basic task if parsing fails
    const item = await prisma.actionItem.create({
      data: {
        intakeId,
        actionType: "TASK",
        status: "NEEDS_INFO",
        extractedFields: JSON.stringify({ summary: rawText.slice(0, 100) }),
        missingFields: JSON.stringify(["details"]),
      },
    });
    return [item];
  }
}

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

    const actionItems = await createActionItems(intake.id, rawText);
    return NextResponse.json({ intake, actionItems }, { status: 201 });
  }

  // Handle multipart (voice input)
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const ext = audioFile.type.includes("webm") ? "webm" : "mp4";
    const audioUrl = await saveAudioFile(audioBuffer, ext);

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

    const actionItems = await createActionItems(intake.id, transcript);
    return NextResponse.json({ intake, actionItems }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
}
