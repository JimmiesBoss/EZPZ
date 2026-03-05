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

export default function QueuePage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/actions")
      .then((r) => r.json())
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "ALL" ? items : items.filter((i) => i.status === filter);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Queue</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["ALL", "NEEDS_INFO", "READY", "IN_PROGRESS", "DONE"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              filter === s ? "bg-black text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">No items yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => {
            const fields = JSON.parse(item.extractedFields || "{}");
            const summary = fields.summary || fields.agenda || fields.subject || item.actionType;
            return (
              <Link
                key={item.id}
                href={`/queue/${item.id}`}
                className="border border-gray-200 rounded-xl p-3 flex items-center justify-between active:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{summary}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.actionType}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_COLORS[item.status] || "bg-gray-100"
                  }`}
                >
                  {item.status.replace("_", " ")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
