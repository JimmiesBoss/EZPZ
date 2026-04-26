"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Message {
  id: string;
  direction: "SYSTEM" | "USER" | "OPERATOR";
  content: string;
  createdAt: string;
}

export default function ClarificationChat({
  requestId,
  messages,
  enabled,
}: {
  requestId: string;
  messages: Message[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send");
      }
      setDraft("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`text-sm rounded-xl px-3 py-2 ${
              m.direction === "USER"
                ? "bg-black text-white self-end max-w-[80%]"
                : "bg-neutral-100 self-start max-w-[80%]"
            }`}
          >
            {m.content}
          </li>
        ))}
      </ul>
      {enabled && (
        <div className="flex gap-2 mt-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your answer…"
            className="flex-1 border border-neutral-300 rounded-xl px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) send();
            }}
          />
          <button
            onClick={send}
            disabled={busy || !draft.trim()}
            className="bg-black text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
