"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CategoryPicker, { type CategorySelection } from "@/components/CategoryPicker";
import RejectionDialog from "@/components/RejectionDialog";

export default function NewRequestPage() {
  const router = useRouter();
  const [selection, setSelection] = useState<CategorySelection | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">New request</h1>
        <p className="text-sm text-neutral-600 mt-1">Step 1 — Category</p>
      </header>

      <CategoryPicker
        value={selection}
        onChange={setSelection}
        onReject={(message) => setRejection(message)}
      />

      <div className="flex justify-end">
        <button
          disabled={!selection?.primaryId}
          onClick={() => {
            if (!selection) return;
            const params = new URLSearchParams({
              primary: selection.primaryId,
              ...(selection.subId ? { sub: selection.subId } : {}),
            });
            router.push(`/requests/new/brief?${params.toString()}`);
          }}
          className="bg-black text-white rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-40"
        >
          Continue
        </button>
      </div>

      {rejection && (
        <RejectionDialog
          message={rejection}
          onClose={() => setRejection(null)}
        />
      )}
    </div>
  );
}
