"use client";

import { useEffect, useState } from "react";

export interface CategoryOption {
  id: string;
  label: string;
  tier: string;
  description: string;
  subcategories: { id: string; label: string }[];
}

export interface CategorySelection {
  primaryId: string;
  primaryLabel: string;
  subId?: string;
  subLabel?: string;
}

type RoutingResponse =
  | { mode: "exact"; primary: { id: string; label: string }; sub: { id: string; label: string } | null; confidence: number }
  | { mode: "partial"; candidates: { primary: { id: string; label: string }; sub: { id: string; label: string } | null; score: number }[] }
  | { mode: "unclear" }
  | { mode: "reject"; reason: string; message: string };

export default function CategoryPicker({
  value,
  onChange,
  onReject,
}: {
  value: CategorySelection | null;
  onChange: (selection: CategorySelection) => void;
  onReject: (message: string) => void;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState<RoutingResponse | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const primary = value ? categories.find((c) => c.id === value.primaryId) : null;

  async function runRouting() {
    if (!text.trim()) return;
    setBusy(true);
    setPartial(null);
    try {
      const res = await fetch("/api/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: RoutingResponse = await res.json();
      if (data.mode === "reject") {
        onReject(data.message);
      } else if (data.mode === "exact") {
        onChange({
          primaryId: data.primary.id,
          primaryLabel: data.primary.label,
          subId: data.sub?.id,
          subLabel: data.sub?.label,
        });
      } else {
        setPartial(data);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Describe what you&apos;re hunting for</label>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2012 Chevy Silverado alternator"
            className="flex-1 border border-neutral-300 rounded-xl px-3 py-2 text-base"
          />
          <button
            onClick={runRouting}
            disabled={!text.trim() || busy}
            className="bg-black text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            {busy ? "…" : "Route"}
          </button>
        </div>
        {partial?.mode === "partial" && (
          <div className="border border-neutral-200 rounded-xl p-3 flex flex-col gap-2">
            <p className="text-xs text-neutral-600">A few categories could fit — pick one:</p>
            {partial.candidates.map((c) => (
              <button
                key={`${c.primary.id}-${c.sub?.id ?? ""}`}
                onClick={() =>
                  onChange({
                    primaryId: c.primary.id,
                    primaryLabel: c.primary.label,
                    subId: c.sub?.id,
                    subLabel: c.sub?.label,
                  })
                }
                className="text-left px-3 py-2 rounded-lg border border-neutral-200 active:bg-neutral-50"
              >
                <span className="font-medium">{c.primary.label}</span>
                {c.sub && <span className="text-neutral-500"> · {c.sub.label}</span>}
              </button>
            ))}
          </div>
        )}
        {partial?.mode === "unclear" && (
          <p className="text-xs text-neutral-500">No clear match — pick a category below.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Or pick a category</label>
        <select
          value={value?.primaryId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            const cat = categories.find((c) => c.id === id);
            if (cat) onChange({ primaryId: cat.id, primaryLabel: cat.label });
          }}
          className="border border-neutral-300 rounded-xl px-3 py-2 text-base"
        >
          <option value="" disabled>
            Choose a category…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {primary && (
          <select
            value={value?.subId ?? ""}
            onChange={(e) => {
              const sub = primary.subcategories.find((s) => s.id === e.target.value);
              if (sub && value) {
                onChange({ ...value, subId: sub.id, subLabel: sub.label });
              }
            }}
            className="border border-neutral-300 rounded-xl px-3 py-2 text-base"
          >
            <option value="" disabled>
              Choose a subcategory…
            </option>
            {primary.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {value && (
        <div className="text-sm text-neutral-700 bg-neutral-50 rounded-xl px-3 py-2">
          Selected:{" "}
          <span className="font-medium">{value.primaryLabel}</span>
          {value.subLabel && <span className="text-neutral-500"> · {value.subLabel}</span>}
        </div>
      )}
    </div>
  );
}
