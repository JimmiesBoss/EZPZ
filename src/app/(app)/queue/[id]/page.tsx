"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface ActionDetail {
  id: string;
  actionType: string;
  status: string;
  extractedFields: string;
  missingFields: string;
  inferredFields: string;
  executionArtifacts: string;
  createdAt: string;
  intake: {
    rawText: string;
    transcript: string | null;
    sourceType: string;
  };
  clarificationMessages: {
    id: string;
    direction: string;
    content: string;
    createdAt: string;
  }[];
}

const STATUS_COLORS: Record<string, string> = {
  NEEDS_INFO: "bg-yellow-100 text-yellow-800",
  READY: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  DONE: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-100 text-gray-600",
};

export default function ActionDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<ActionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/actions/${id}`)
      .then((r) => r.json())
      .then(setItem)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-400 text-sm p-4">Loading...</p>;
  if (!item) return <p className="text-red-500 text-sm p-4">Not found</p>;

  const fields = JSON.parse(item.extractedFields || "{}");
  const artifacts = JSON.parse(item.executionArtifacts || "{}");

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/queue" className="text-sm text-gray-400 mb-2 inline-block">
        &larr; Back to queue
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{fields.summary || item.actionType}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            STATUS_COLORS[item.status] || "bg-gray-100"
          }`}
        >
          {item.status.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-4">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-1">Type</h2>
          <p className="text-sm">{item.actionType}</p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-1">Original Input</h2>
          <p className="text-sm bg-gray-50 rounded-lg p-3">
            {item.intake.rawText || item.intake.transcript}
          </p>
        </section>

        {Object.keys(fields).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Fields</h2>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {Object.entries(fields).map(([k, v]) => (
                <div key={k} className="flex text-sm">
                  <span className="text-gray-500 w-28 shrink-0">{k}</span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {Object.keys(artifacts).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Artifacts</h2>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {Object.entries(artifacts).map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="text-gray-500">{k}: </span>
                  <a href={String(v)} className="text-blue-600 underline" target="_blank">
                    {String(v)}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {item.clarificationMessages.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-1">Clarification</h2>
            <div className="space-y-2">
              {item.clarificationMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`text-sm rounded-lg p-3 ${
                    msg.direction === "SYSTEM"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-black text-white ml-8"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
