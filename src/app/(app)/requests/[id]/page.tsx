import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getCategory, getSubcategory } from "@/lib/categories";
import ClarificationChat from "@/components/ClarificationChat";
import MatchCard from "@/components/MatchCard";
import { sanitizeMatch } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export default async function RequestDetail({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const request = await prisma.partsRequest.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      images: true,
      matches: { orderBy: { confidence: "desc" } },
    },
  });
  if (!request) notFound();
  if (request.buyerId !== user.id && user.role !== "OPERATOR") notFound();

  const visibleMatches = request.matches
    .filter((m) => user.role === "OPERATOR" || !m.hiddenFromBuyer)
    .map((m) => sanitizeMatch(m, user.role));
  const canApprove =
    request.status === "AWAITING_REVIEW" && request.buyerId === user.id;

  const cat = getCategory(request.primaryCategory);
  const sub = getSubcategory(request.primaryCategory, request.subCategory);
  const specs = JSON.parse(request.specs || "{}") as Record<string, unknown>;
  const missing = JSON.parse(request.missingFields || "[]") as string[];
  const rejections = JSON.parse(request.rejectionReasons || "[]") as string[];

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Link href="/requests" className="text-sm text-neutral-500">
        ← All requests
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{request.status}</p>
        <h1 className="text-2xl font-bold">{request.title}</h1>
        <p className="text-sm text-neutral-600">
          {cat?.label ?? request.primaryCategory}
          {sub ? ` · ${sub.label}` : ""} · ${(request.budgetCents / 100).toFixed(2)} budget
        </p>
      </header>

      {request.status === "REJECTED" && rejections.length > 0 && (
        <section className="border border-red-200 bg-red-50 rounded-2xl p-4 flex flex-col gap-1">
          <p className="text-sm font-medium text-red-800">Out of scope</p>
          <ul className="text-sm text-red-700 list-disc pl-5">
            {rejections.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Description</p>
        <p className="text-sm whitespace-pre-line">{request.rawDescription}</p>
        {request.audioUrl && (
          <audio controls src={request.audioUrl} className="w-full mt-1" />
        )}
      </section>

      {request.images.length > 0 && (
        <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Photos</p>
          <div className="flex flex-wrap gap-2">
            {request.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt="request"
                className="w-24 h-24 object-cover rounded-lg border border-neutral-200"
              />
            ))}
          </div>
        </section>
      )}

      <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Parsed specs</p>
        {Object.keys(specs).length === 0 ? (
          <p className="text-sm text-neutral-500">None extracted yet.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {Object.entries(specs).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-neutral-500">{k}</dt>
                <dd className="text-neutral-900 break-words">
                  {Array.isArray(v) ? v.join(", ") : String(v ?? "")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {visibleMatches.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500 px-1">
            Matches ({visibleMatches.length})
          </p>
          {request.status === "SEARCHING" && (
            <p className="text-sm text-neutral-500 px-1">Sourcing… more results may arrive.</p>
          )}
          <div className="flex flex-col gap-3">
            {visibleMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                canApprove={canApprove && m.status !== "BUYER_APPROVED"}
                serviceFeeCents={request.serviceFeeCents}
              />
            ))}
          </div>
        </section>
      )}

      {request.matches.length === 0 && request.status === "SEARCHING" && (
        <section className="border border-neutral-200 rounded-2xl p-4 text-sm text-neutral-600">
          AI agents are searching marketplaces… check back in a moment.
        </section>
      )}

      {request.messages.length > 0 && (
        <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Clarifications</p>
          <ClarificationChat
            requestId={request.id}
            messages={request.messages.map((m) => ({
              id: m.id,
              direction: m.direction as "SYSTEM" | "USER" | "OPERATOR",
              content: m.content,
              createdAt: m.createdAt.toISOString(),
            }))}
            enabled={request.status === "CLARIFYING" && request.buyerId === user.id}
          />
          {missing.length > 0 && request.status === "CLARIFYING" && (
            <p className="text-xs text-neutral-500">
              {missing.length} more {missing.length === 1 ? "field" : "fields"} needed.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
