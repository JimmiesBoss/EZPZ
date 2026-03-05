"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ActionItem {
  id: string;
  actionType: string;
  status: string;
  extractedFields: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  NEEDS_INFO: "bg-yellow-100 text-yellow-800",
  READY: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  DONE: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

function safeParse(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str || "{}");
  } catch {
    return {};
  }
}

export default function QueuePage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/actions");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load queue. Pull down to retry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = filter === "ALL" ? items : items.filter((i) => i.status === filter);

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Queue</h1>
        <button
          onClick={loadItems}
          className="text-xs text-gray-400 active:text-black transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {["ALL", "NEEDS_INFO", "READY", "IN_PROGRESS", "DONE"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s ? "bg-black text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {error ? (
        <div className="text-center py-8">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={loadItems} className="text-sm text-black underline">
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">
          {filter === "ALL" ? "No items yet. Go capture something!" : "No items with this status."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => {
            const fields = safeParse(item.extractedFields);
            const summary = String(
              fields.summary || fields.agenda || fields.subject || item.actionType
            );
            return (
              <Link
                key={item.id}
                href={`/queue/${item.id}`}
                className="border border-gray-200 rounded-xl p-3 flex items-center justify-between active:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 mr-2">
                  <p className="font-medium text-sm truncate">{summary}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.actionType}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    STATUS_COLORS[item.status] || "bg-gray-100"
                  }`}
                >
                  {item.status.replace(/_/g, " ")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
