"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function BriefStep() {
  const router = useRouter();
  const params = useSearchParams();
  const primary = params.get("primary") ?? "";
  const sub = params.get("sub") ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("250");

  const ready = title.trim().length > 0 && description.trim().length > 10;

  return (
    <div className="flex flex-col gap-5">
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
        <button
          onClick={() => router.back()}
          className="text-sm text-neutral-600"
        >
          Back
        </button>
        <button
          disabled={!ready}
          onClick={() => {
            const next = new URLSearchParams({
              primary,
              ...(sub ? { sub } : {}),
              title,
              description,
              budget,
            });
            router.push(`/requests/new/review?${next.toString()}`);
          }}
          className="bg-black text-white rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
