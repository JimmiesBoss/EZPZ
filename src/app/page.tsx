import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/requests");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Widgeter</h1>
      <p className="mt-3 max-w-md text-neutral-600">
        Find rare, discontinued, and hard-to-find parts. AI agents scour
        marketplaces; we handle the hunt.
      </p>
      <Link
        href="/login"
        className="mt-8 bg-black text-white rounded-full px-6 py-3 text-base font-medium"
      >
        Get started
      </Link>
    </main>
  );
}
