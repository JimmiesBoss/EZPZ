"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ActionDetail {
  id: string;
  actionType: string;
  status: string;
  extractedFields: string;
  missingFields: string;
  inferredFields: string;
  executionArtifacts: string;
  createdAt: string;
  intake: {
    rawText: string;
    transcript: string | null;
    sourceType: string;
  };
  clarificationMessages: {
    id: string;
    direction: string;
    content: string;
    createdAt: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  NEEDS_INFO: "bg-yellow-100 text-yellow-800",
  READY: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  DONE: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

function safeParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export default function ActionDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<ActionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/actions/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setItem)
      .catch(() => setError("Could not load action item."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [item?.clarificationMessages.length]);

  async function handleClarify() {
    if (!answer.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/actions/${id}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItem(updated);
        setAnswer("");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to send");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="animate-pulse space-y-4 pt-4">
          <div className="h-4 bg-gray-100 rounded w-16" />
          <div className="h-6 bg-gray-100 rounded w-3/4" />
          <div className="h-20 bg-gray-50 rounded-xl" />
          <div className="h-32 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-red-500 text-sm mb-2">{error}</p>
        <Link href="/queue" className="text-sm text-black underline">
          Back to queue
        </Link>
      </div>
    );
  }

  if (!item) return null;

  const fields = safeParse<Record<string, unknown>>(item.extractedFields, {});
  const inferred = safeParse<Record<string, unknown>>(item.inferredFields, {});
  const artifacts = safeParse<Record<string, unknown>>(item.executionArtifacts, {});
  const missing: string[] = safeParse(item.missingFields, []);
  const allFields = { ...inferred, ...fields };

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/queue" className="text-sm text-gray-400 mb-2 inline-block">
        &larr; Back to queue
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold truncate mr-2">
          {String(fields.summary || fields.agenda || fields.subject || item.actionType)}
        </h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
            STATUS_COLORS[item.status] || "bg-gray-100"
          }`}
        >
          {item.status.replace(/_/g, " ")}
        </span>
      </div>

      {error && (
        <p className="text-red-500 text-xs mb-3">{error}</p>
      )}

      <div className="space-y-4">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-1">Type</h2>
          <p className="text-sm">{item.actionType}</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-1">
            Original Input
            {item.intake.sourceType === "VOICE" && (
              <span className="ml-1 text-xs font-normal text-gray-400">(voice)</span>
            )}
          </h2>
          <p className="text-sm bg-gray-50 rounded-lg p-3">
            {item.intake.rawText || item.intake.transcript}
          </p>
        </section>

        {Object.keys(allFields).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Fields</h2>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {Object.entries(allFields).map(([k, v]) => (
                <div key={k} className="flex text-sm">
                  <span className="text-gray-500 w-28 shrink-0">{k.replace(/_/g, " ")}</span>
                  <span className="break-words">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {Object.keys(artifacts).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Artifacts</h2>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {Object.entries(artifacts).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="text-gray-500">{k.replace(/_/g, " ")}: </span>
                  <a
                    href={String(v)}
                    className="text-blue-600 underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {String(v)}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Clarification chat */}
        {item.clarificationMessages.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Clarification</h2>
            <div className="space-y-2">
              {item.clarificationMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm rounded-lg p-3 ${
                    msg.direction === "SYSTEM"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-black text-white ml-8"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </section>
        )}

        {/* Clarification input */}
        {item.status === "NEEDS_INFO" && missing.length > 0 && (
          <section className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleClarify()}
              placeholder="Type your answer..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              disabled={sending}
              autoFocus
            />
            <button
              onClick={handleClarify}
              disabled={sending || !answer.trim()}
              className="bg-black text-white rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
            >
              {sending ? "..." : "Send"}
            </button>
          </section>
        )}

        {item.status === "READY" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            All fields resolved. Dispatching to Elvis...
          </div>
        )}

        {item.status === "IN_PROGRESS" && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800">
            Elvis is working on this...
          </div>
        )}

        {item.status === "DONE" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
            Completed.
          </div>
        )}
      </div>
    </div>
  );
}
