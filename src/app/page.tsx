import Link from "next/link";

export default function Home() {
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
      <Link href="/requests" className="mt-3 text-sm text-neutral-500 underline">
        Already signed in? Open my requests
      </Link>
    </main>
  );
}
