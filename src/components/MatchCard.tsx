"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SanitizedMatch } from "@/lib/sanitize";

export default function MatchCard({
  match,
  canApprove,
  serviceFeeCents,
}: {
  match: SanitizedMatch;
  canApprove: boolean;
  serviceFeeCents: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const total = match.priceCents + match.shippingCents + serviceFeeCents;

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${match.id}/approve`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to approve");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        {match.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.thumbnailUrl}
            alt={match.title}
            className="w-16 h-16 object-cover rounded-lg border border-neutral-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-neutral-100" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {match.source ? match.source.marketplace : match.displayLabel}
          </p>
          <p className="font-medium leading-tight">{match.title}</p>
          <p className="text-sm text-neutral-700">
            ${(match.priceCents / 100).toFixed(2)}
            {match.shippingCents > 0 && (
              <span className="text-neutral-500"> + ${(match.shippingCents / 100).toFixed(2)} ship</span>
            )}
            <span className="text-neutral-500"> · {match.condition}</span>
          </p>
        </div>
      </div>

      {match.source && (
        <div className="text-xs text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2">
          <p>
            Seller: <span className="font-medium">{match.source.sellerHandle}</span>
            {" · "}
            {match.source.sellerLocation}
          </p>
          <a href={match.source.listingUrl} className="underline text-neutral-700" target="_blank" rel="noopener noreferrer">
            Open listing
          </a>
        </div>
      )}

      {Object.keys(match.specHighlights).length > 0 && (
        <div className="text-xs text-neutral-600 flex flex-wrap gap-1">
          {Object.entries(match.specHighlights).map(([k, v]) => (
            <span key={k} className="bg-neutral-100 rounded-full px-2 py-0.5">
              {k}: {String(v)}
            </span>
          ))}
        </div>
      )}

      {canApprove && (
        <>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="bg-black text-white rounded-full py-2 text-sm font-medium disabled:opacity-40"
            >
              Approve this match
            </button>
          ) : (
            <div className="border border-neutral-200 rounded-xl p-3 text-sm flex flex-col gap-2">
              <p>You&apos;ll be charged a non-refundable ${(serviceFeeCents / 100).toFixed(2)} service fee now. Item + shipping (${((match.priceCents + match.shippingCents) / 100).toFixed(2)}) is authorized and captured on delivery.</p>
              <p className="text-xs text-neutral-600">Total: ${(total / 100).toFixed(2)}</p>
              <div className="flex gap-2">
                <button
                  onClick={approve}
                  disabled={busy}
                  className="flex-1 bg-black text-white rounded-full py-2 text-sm font-medium disabled:opacity-40"
                >
                  {busy ? "Approving…" : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="text-sm text-neutral-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
