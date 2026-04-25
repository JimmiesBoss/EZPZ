import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireBuyer } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await requireBuyer();
  const requests = await prisma.partsRequest.findMany({
    where: user.role === "OPERATOR" ? {} : { buyerId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your requests</h1>
        <Link
          href="/requests/new"
          className="bg-black text-white text-sm font-medium rounded-full px-4 py-2"
        >
          New
        </Link>
      </header>

      {requests.length === 0 ? (
        <div className="text-center text-neutral-500 py-16">
          <p>No requests yet.</p>
          <p className="text-sm mt-2">Tap “New” to start a parts hunt.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="block border border-neutral-200 rounded-2xl p-4 active:bg-neutral-50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium truncate">{r.title}</p>
                  <span className="text-xs uppercase tracking-wide text-neutral-500">
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mt-1">
                  {r.primaryCategory} · ${(r.budgetCents / 100).toFixed(0)} budget
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
