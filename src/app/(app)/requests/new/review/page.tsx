"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Waiver {
  id: string;
  title: string;
  body: string;
  version: string;
}

export default function ReviewStep() {
  const router = useRouter();
  const params = useSearchParams();
  const primary = params.get("primary") ?? "";
  const sub = params.get("sub") ?? "";
  const title = params.get("title") ?? "";
  const description = params.get("description") ?? "";
  const budget = params.get("budget") ?? "0";

  const [waiver, setWaiver] = useState<Waiver | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/categories`)
      .then((r) => r.json())
      .then(() => {
        // Waiver is fetched via a small inline endpoint — derive from category id below.
      });
    // Fetch waiver via dedicated endpoint
    fetch(`/api/waivers?category=${encodeURIComponent(primary)}`)
      .then((r) => r.json())
      .then((d) => setWaiver(d.waiver ?? null));
  }, [primary]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryCategory: primary,
          subCategory: sub || undefined,
          title,
          description,
          budgetCents: Math.round(parseFloat(budget) * 100),
          waiverAccepted: accepted,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit");
      }
      const data = await res.json();
      router.push(`/requests/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header>
        <h1 className="text-2xl font-bold">New request</h1>
        <p className="text-sm text-neutral-600 mt-1">Step 3 — Review &amp; waiver</p>
      </header>

      <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Summary</p>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-neutral-700 whitespace-pre-line">{description}</p>
        <p className="text-sm text-neutral-600">
          Budget: ${parseFloat(budget).toFixed(2)}
        </p>
        <p className="text-xs text-neutral-500">
          Category: {primary}
          {sub ? ` · ${sub}` : ""}
        </p>
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
