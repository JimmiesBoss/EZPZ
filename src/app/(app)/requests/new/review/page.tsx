"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Waiver {
  id: string;
  title: string;
  body: string;
  version: string;
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

export default function ReviewStep() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [waiver, setWaiver] = useState<Waiver | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) {
      router.replace("/requests/new");
      return;
    }
    try {
      const d = JSON.parse(raw) as DraftPayload;
      setDraft(d);
      fetch(`/api/waivers?category=${encodeURIComponent(d.primary)}`)
        .then((r) => r.json())
        .then((res) => setWaiver(res.waiver ?? null));
    } catch {
      router.replace("/requests/new");
    }
  }, [router]);

  async function submit() {
    if (!draft) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryCategory: draft.primary,
          subCategory: draft.sub || undefined,
          title: draft.title,
          description: draft.description,
          budgetCents: Math.round(parseFloat(draft.budget) * 100),
          waiverAccepted: accepted,
          imageUrls: draft.imageUrls,
          audioUrl: draft.audioUrl || undefined,
          transcript: draft.transcript || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit");
      }
      const data = await res.json();
      sessionStorage.removeItem(DRAFT_KEY);
      router.push(`/requests/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
      setSubmitting(false);
    }
  }

  if (!draft) return null;

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header>
        <h1 className="text-2xl font-bold">New request</h1>
        <p className="text-sm text-neutral-600 mt-1">Step 3 — Review &amp; waiver</p>
      </header>

      <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Summary</p>
        <p className="font-medium">{draft.title}</p>
        <p className="text-sm text-neutral-700 whitespace-pre-line">{draft.description}</p>
        <p className="text-sm text-neutral-600">
          Budget: ${parseFloat(draft.budget).toFixed(2)}
        </p>
        <p className="text-xs text-neutral-500">
          Category: {draft.primary}
          {draft.sub ? ` · ${draft.sub}` : ""}
        </p>
        {draft.imageUrls.length > 0 && (
          <p className="text-xs text-neutral-500">
            {draft.imageUrls.length} photo{draft.imageUrls.length === 1 ? "" : "s"} attached
          </p>
        )}
        {draft.transcript && (
          <p className="text-xs text-neutral-500">Voice note attached</p>
        )}
      </section>

      {waiver && (
        <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Waiver — {waiver.title}</p>
          <p className="text-xs text-neutral-700 whitespace-pre-line">{waiver.body}</p>
          <label className="flex items-start gap-2 mt-2 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>I&apos;ve read and accept the {waiver.title.toLowerCase()} waiver.</span>
          </label>
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between">
        <button onClick={() => router.back()} className="text-sm text-neutral-600">
          Back
        </button>
        <button
          disabled={!accepted || submitting}
          onClick={submit}
          className="bg-black text-white rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </div>
  );
}
