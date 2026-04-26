import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getCategory, getSubcategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function RequestDetail({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const request = await prisma.partsRequest.findUnique({
    where: { id: params.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      images: true,
    },
  });
  if (!request) notFound();
  if (request.buyerId !== user.id && user.role !== "OPERATOR") notFound();

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

      {request.messages.length > 0 && (
        <section className="border border-neutral-200 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Clarifications</p>
          <ul className="flex flex-col gap-2">
            {request.messages.map((m) => (
              <li
                key={m.id}
                className={`text-sm rounded-xl px-3 py-2 ${
                  m.direction === "USER"
                    ? "bg-black text-white self-end max-w-[80%]"
                    : "bg-neutral-100 self-start max-w-[80%]"
                }`}
              >
                {m.content}
              </li>
            ))}
          </ul>
          {missing.length > 0 && request.status === "CLARIFYING" && (
            <p className="text-xs text-neutral-500">
              Phase 6 will let you answer these inline.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
