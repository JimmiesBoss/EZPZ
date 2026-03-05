"use client";

import { useState } from "react";

export default function CapturePage() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "TEXT", rawText: text }),
      });
      if (res.ok) {
        setText("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg mx-auto pt-8">
      <h1 className="text-2xl font-bold">What do you need done?</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Schedule a meeting with John next Tuesday at 2pm to discuss the Q2 pipeline..."
        className="w-full border border-gray-300 rounded-xl p-4 text-base resize-none focus:outline-none focus:ring-2 focus:ring-black"
        rows={4}
      />
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="flex-1 bg-black text-white rounded-full py-3 text-base font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? "Sending..." : "Send"}
        </button>
        <button
          className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl active:scale-95 transition-transform"
          title="Voice capture (coming soon)"
        >
          🎤
        </button>
      </div>
    </div>
  );
}
