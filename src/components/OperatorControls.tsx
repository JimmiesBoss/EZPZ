"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface OrderProps {
  id: string;
  fulfillmentStatus: string;
  escrowState: string;
  trackingNumber: string | null;
  buyerVerificationDeadline: string | null;
  sellerPayoutReleaseAt: string | null;
}

export default function OperatorControls({
  requestId,
  requestStatus,
  order,
  matches,
}: {
  requestId: string;
  requestStatus: string;
  order: OrderProps | null;
  matches: { id: string; title: string; hiddenFromBuyer: boolean; proofVideoUrl: string | null }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState(order?.trackingNumber ?? "");
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "FAILED");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchMatch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("FAILED");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-2 border-amber-200 bg-amber-50 rounded-2xl p-4 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-wide text-amber-800 font-semibold">Operator console</p>

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={() => call(`/api/requests/${requestId}/search`)}
          className="bg-white border border-amber-300 rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          Re-run search
        </button>
      </div>

      {matches.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-amber-900">Matches</p>
          {matches.map((m) => (
            <div
              key={m.id}
              className="text-xs bg-white border border-amber-200 rounded-lg px-2 py-1.5 flex items-center justify-between gap-2"
            >
              <span className="truncate flex-1">{m.title}</span>
              <button
                onClick={() => patchMatch(m.id, { hiddenFromBuyer: !m.hiddenFromBuyer })}
                disabled={busy}
                className="text-xs underline text-amber-800"
              >
                {m.hiddenFromBuyer ? "Show" : "Hide"}
              </button>
              <button
                onClick={() => {
                  const url = prompt("Proof video URL", m.proofVideoUrl ?? "");
                  if (url !== null) patchMatch(m.id, { proofVideoUrl: url });
                }}
                disabled={busy}
                className="text-xs underline text-amber-800"
              >
                Proof
              </button>
            </div>
          ))}
        </div>
      )}

      {order && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-amber-900">Fulfillment</p>
          <div className="flex flex-wrap gap-2">
            {order.fulfillmentStatus === "PENDING" && (
              <button
                disabled={busy}
                onClick={() => call(`/api/orders/${order.id}/advance`, { target: "PURCHASED" })}
                className="bg-white border border-amber-300 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                Mark purchased
              </button>
            )}
            {order.fulfillmentStatus === "PURCHASED" && (
              <div className="flex items-center gap-2">
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Tracking #"
                  className="border border-amber-300 rounded-full px-3 py-1.5 text-xs bg-white"
                />
                <button
                  disabled={busy}
                  onClick={() =>
                    call(`/api/orders/${order.id}/advance`, {
                      target: "IN_TRANSIT",
                      trackingNumber: tracking,
                    })
                  }
                  className="bg-white border border-amber-300 rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  Mark in transit
                </button>
              </div>
            )}
            {order.fulfillmentStatus === "IN_TRANSIT" && (
              <button
                disabled={busy}
                onClick={() => call(`/api/orders/${order.id}/advance`, { target: "DELIVERED" })}
                className="bg-white border border-amber-300 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                Mark delivered
              </button>
            )}
          </div>

          <p className="text-xs font-semibold text-amber-900 mt-2">Escrow</p>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs">{order.escrowState}</span>
            <button
              disabled={busy}
              onClick={() => call(`/api/orders/${order.id}/fast-forward`)}
              className="bg-white border border-amber-300 rounded-full px-3 py-1.5 text-xs font-medium"
            >
              Fast-forward clock
            </button>
            {order.escrowState === "BUYER_VERIFIED" && (
              <button
                disabled={busy}
                onClick={() => call(`/api/orders/${order.id}/release-payout`)}
                className="bg-white border border-amber-300 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                Release payout
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-amber-900/70">Request status: {requestStatus}</p>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
