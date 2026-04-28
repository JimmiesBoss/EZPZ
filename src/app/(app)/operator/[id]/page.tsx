import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getCategory, getSubcategory } from "@/lib/categories";
import OperatorControls from "@/components/OperatorControls";
import OrderTimeline from "@/components/OrderTimeline";

export const dynamic = "force-dynamic";

export default async function OperatorRequestDetail({
  params,
}: {
  params: { id: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "OPERATOR") redirect("/requests");

  const request = await prisma.partsRequest.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      images: true,
      matches: { orderBy: { confidence: "desc" } },
      order: true,
      buyer: true,
    },
  });
  if (!request) notFound();

  const cat = getCategory(request.primaryCategory);
  const sub = getSubcategory(request.primaryCategory, request.subCategory);
  const specs = JSON.parse(request.specs || "{}") as Record<string, unknown>;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Link href="/operator" className="text-sm text-neutral-500">
        ← Operator inbox
      </Link>

      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">{request.status}</p>
        <h1 className="text-2xl font-bold">{request.title}</h1>
        <p className="text-sm text-neutral-600">
          Buyer: {request.buyer.email} · {cat?.label}
          {sub ? ` · ${sub.label}` : ""}
        </p>
      </header>

      <OperatorControls
        requestId={request.id}
        requestStatus={request.status}
        order={
          request.order
            ? {
                id: request.order.id,
                fulfillmentStatus: request.order.fulfillmentStatus,
                escrowState: request.order.escrowState,
                trackingNumber: request.order.trackingNumber,
                buyerVerificationDeadline:
                  request.order.buyerVerificationDeadline?.toISOString() ?? null,
                sellerPayoutReleaseAt:
                  request.order.sellerPayoutReleaseAt?.toISOString() ?? null,
              }
            : null
        }
        matches={request.matches.map((m) => ({
          id: m.id,
          title: m.title,
          hiddenFromBuyer: m.hiddenFromBuyer,
          proofVideoUrl: m.proofVideoUrl,
        }))}
      />

      <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Description</p>
        <p className="text-sm whitespace-pre-line">{request.rawDescription}</p>
      </section>

      <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Parsed specs</p>
        {Object.keys(specs).length === 0 ? (
          <p className="text-sm text-neutral-500">None.</p>
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

      {request.matches.length > 0 && (
        <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">All matches (operator view)</p>
          <ul className="flex flex-col gap-2 text-sm">
            {request.matches.map((m) => (
              <li key={m.id} className="border border-neutral-200 rounded-xl p-2">
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-neutral-600">
                  {m.sourceMarketplace} · {m.sellerHandle} · {m.sellerLocation} · {m.condition}
                </p>
                <p className="text-xs text-neutral-500">
                  ${(m.priceCents / 100).toFixed(2)} · status {m.status}
                  {m.hiddenFromBuyer ? " · hidden" : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {request.order && (
        <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Order timeline</p>
          <OrderTimeline timelineJson={request.order.timeline} />
        </section>
      )}
    </div>
  );
}
