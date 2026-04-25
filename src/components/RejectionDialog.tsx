"use client";

export default function RejectionDialog({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-5 flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Out of scope</h2>
        <p className="text-sm text-neutral-700 whitespace-pre-line">{message}</p>
        <button
          onClick={onClose}
          className="bg-black text-white rounded-full py-2.5 text-sm font-medium"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
