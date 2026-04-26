"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EscrowActions({
  orderId,
  escrowState,
  fulfillmentStatus,
  buyerVerificationDeadline,
  sellerPayoutReleaseAt,
}: {
  orderId: string;
  escrowState: string;
  fulfillmentStatus: string;
  buyerVerificationDeadline: string | null;
  sellerPayoutReleaseAt: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canVerify = escrowState === "HELD" && fulfillmentStatus === "DELIVERED";
  const canDispute = canVerify;

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

  async function openDispute() {
    const reason = prompt("What's wrong with the part?");
    if (!reason) return;
    await call(`/api/orders/${orderId}/dispute`, { reason });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-neutral-500">
        Escrow: <span className="font-medium">{escrowState}</span>
      </p>
      {buyerVerificationDeadline && (
        <p className="text-xs text-neutral-500">
          Verify by: {new Date(buyerVerificationDeadline).toLocaleString()}
        </p>
      )}
      {sellerPayoutReleaseAt && (
        <p className="text-xs text-neutral-500">
          Seller payout: {new Date(sellerPayoutReleaseAt).toLocaleString()}
        </p>
      )}
      {(canVerify || canDispute) && (
        <div className="flex gap-2 pt-1">
          <button
            disabled={busy || !canVerify}
            onClick={() => call(`/api/orders/${orderId}/verify`)}
            className="bg-black text-white rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Verify delivery
          </button>
          <button
            disabled={busy || !canDispute}
            onClick={openDispute}
            className="border border-neutral-300 rounded-full px-4 py-2 text-sm font-medium"
          >
            Open dispute
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
