import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { getCategory } from "@/lib/categories";

export const dynamic = "force-dynamic";

const ACTIVE = [
  "SUBMITTED",
  "CLARIFYING",
  "SEARCHING",
  "CURATED",
  "AWAITING_REVIEW",
  "APPROVED",
  "ACQUIRING",
  "SHIPPED",
];

export default async function OperatorInbox() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "OPERATOR") redirect("/requests");

  const requests = await prisma.partsRequest.findMany({
    where: { status: { in: ACTIVE } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Operator inbox</h1>
        <p className="text-sm text-neutral-600 mt-1">{requests.length} active requests</p>
      </header>

      {requests.length === 0 ? (
        <p className="text-sm text-neutral-500 py-12 text-center">All caught up.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r) => {
            const cat = getCategory(r.primaryCategory);
            return (
              <li key={r.id}>
                <Link
                  href={`/operator/${r.id}`}
                  className="block border border-neutral-200 rounded-2xl p-4 active:bg-neutral-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium truncate">{r.title}</p>
                    <span className="text-xs uppercase tracking-wide text-neutral-500">
                      {r.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 mt-1">
                    {cat?.label ?? r.primaryCategory} · ${(r.budgetCents / 100).toFixed(0)} budget
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
