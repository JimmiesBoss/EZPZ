"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface UploadedImage {
  id: string;
  url: string;
  mediaType: string;
  preview: string;
}

interface DraftPayload {
  primary: string;
  sub: string;
  title: string;
  description: string;
  budget: string;
  imageUrls: string[];
  audioUrl: string;
  transcript: string;
}

const DRAFT_KEY = "widgeter:newRequest";

export default function BriefStep() {
  const router = useRouter();
  const params = useSearchParams();
  const primary = params.get("primary") ?? "";
  const sub = params.get("sub") ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("250");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const recorder = useVoiceRecorder();

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw) as DraftPayload;
        if (d.primary === primary) {
          setTitle(d.title || "");
          setDescription(d.description || "");
          setBudget(d.budget || "250");
          setTranscript(d.transcript || "");
          setAudioUrl(d.audioUrl || "");
          setImages(
            (d.imageUrls || []).map((u) => ({
              id: u,
              url: u,
              mediaType: "image/jpeg",
              preview: u,
            }))
          );
        }
      } catch {
        /* ignore */
      }
    }
  }, [primary]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const remaining = 5 - images.length;
      const list = Array.from(files).slice(0, Math.max(0, remaining));
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: fd });
        if (!res.ok) continue;
        const data = await res.json();
        const preview = URL.createObjectURL(file);
        setImages((prev) => [
          ...prev,
          { id: data.id, url: data.url, mediaType: data.mediaType, preview },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleVoice() {
    if (recorder.isRecording) {
      const blob = await recorder.stop();
      if (!blob) return;
      const fd = new FormData();
      fd.append("audio", blob, "voice.webm");
      setBusy(true);
      try {
        const res = await fetch("/api/intake/voice", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          setAudioUrl(data.audioUrl ?? "");
          if (data.transcript) {
            setTranscript(data.transcript);
            setDescription((d) =>
              d
                ? `${d}\n\n--- Voice note ---\n${data.transcript}`
                : data.transcript
            );
          }
        }
      } finally {
        setBusy(false);
      }
    } else {
      await recorder.start();
    }
  }

  function persistAndContinue() {
    const draft: DraftPayload = {
      primary,
      sub,
      title,
      description,
      budget,
      imageUrls: images.map((i) => i.url),
      audioUrl,
      transcript,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    router.push(`/requests/new/review`);
  }

  const ready = title.trim().length > 0 && description.trim().length > 10;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header>
        <h1 className="text-2xl font-bold">New request</h1>
        <p className="text-sm text-neutral-600 mt-1">Step 2 — Brief</p>
      </header>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="1974 Fender Champ output transformer"
          className="border border-neutral-300 rounded-xl px-3 py-2 text-base"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Brand, model, serial / part number, condition, anything else useful…"
          className="border border-neutral-300 rounded-xl px-3 py-2 text-base resize-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoice}
            disabled={busy}
            className={`text-sm rounded-full px-3 py-1.5 ${
              recorder.isRecording ? "bg-red-500 text-white" : "bg-neutral-100 text-neutral-800"
            } disabled:opacity-40`}
          >
            {recorder.isRecording ? `● Stop (${recorder.duration}s)` : "🎤 Record voice note"}
          </button>
          {recorder.error && <span className="text-xs text-red-600">{recorder.error}</span>}
          {transcript && !recorder.isRecording && (
            <span className="text-xs text-neutral-500">Voice appended</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Photos (up to 5)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy || images.length >= 5}
          onChange={(e) => handleFiles(e.target.files)}
          className="text-sm"
        />
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {images.map((img) => (
              <div key={img.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt="preview"
                  className="w-20 h-20 object-cover rounded-lg border border-neutral-200"
                />
                <button
                  onClick={() => setImages((prev) => prev.filter((p) => p.id !== img.id))}
                  className="absolute -top-1 -right-1 bg-black text-white rounded-full w-5 h-5 text-xs"
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Budget (USD)</label>
        <input
          type="number"
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="border border-neutral-300 rounded-xl px-3 py-2 text-base"
        />
        <p className="text-xs text-neutral-500">A non-refundable $25 service fee is captured at approval.</p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => router.back()} className="text-sm text-neutral-600">
          Back
        </button>
        <button
          disabled={!ready}
          onClick={persistAndContinue}
          className="bg-black text-white rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
