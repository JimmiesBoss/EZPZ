"use client";

import { useState } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

export default function CapturePage() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const recorder = useVoiceRecorder();

  async function handleTextSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "TEXT", rawText: text }),
      });
      if (res.ok) {
        setText("");
        setStatus("Sent!");
        setTimeout(() => setStatus(null), 2000);
      } else {
        setStatus("Failed to send");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVoiceToggle() {
    if (recorder.isRecording) {
      setStatus("Processing...");
      const blob = await recorder.stop();
      if (!blob) {
        setStatus(null);
        return;
      }

      setSubmitting(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        const res = await fetch("/api/intake", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          setStatus("Sent!");
          setTimeout(() => setStatus(null), 2000);
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus(data.error || "Failed to process");
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      await recorder.start();
    }
  }

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto pt-8">
      <h1 className="text-2xl font-bold">What do you need done?</h1>

      {recorder.isRecording ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <span className="text-white text-3xl">●</span>
          </div>
          <p className="text-lg font-mono">{formatDuration(recorder.duration)}</p>
          <p className="text-sm text-gray-500">Recording... tap to stop</p>
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Schedule a meeting with John next Tuesday at 2pm to discuss the Q2 pipeline..."
          className="w-full border border-gray-300 rounded-xl p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-black"
          rows={4}
          disabled={submitting}
        />
      )}

      {(recorder.error || status) && (
        <p
          className={`text-sm text-center ${
            status === "Sent!" ? "text-green-600" : "text-red-500"
          }`}
        >
          {recorder.error || status}
        </p>
      )}

      <div className="flex gap-3">
        {!recorder.isRecording && (
          <button
            onClick={handleTextSubmit}
            disabled={submitting || !text.trim()}
            className="flex-1 bg-black text-white rounded-full py-3 text-base font-medium disabled:opacity-40 active:scale-95 transition-transform"
          >
            {submitting ? "Processing..." : "Send"}
          </button>
        )}
        <button
          onClick={handleVoiceToggle}
          disabled={submitting}
          className={`${
            recorder.isRecording
              ? "flex-1 bg-red-500"
              : "w-14 h-14 bg-red-500"
          } text-white rounded-full flex items-center justify-center text-2xl active:scale-95 transition-transform disabled:opacity-40`}
        >
          {recorder.isRecording ? "Stop & Send" : "🎤"}
        </button>
      </div>
    </div>
  );
}
