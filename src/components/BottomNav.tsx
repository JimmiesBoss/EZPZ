"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const items = [
  { href: "/requests", label: "Requests", match: (p: string) => p.startsWith("/requests") },
  { href: "/requests/new", label: "New", match: (p: string) => p === "/requests/new" },
];

const operatorItem = {
  href: "/operator",
  label: "Operator",
  match: (p: string) => p.startsWith("/operator"),
};

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const nav = session?.user?.role === "OPERATOR" ? [...items, operatorItem] : items;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 flex items-stretch justify-around pb-[var(--safe-bottom)] z-40">
      {nav.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center py-3 text-xs font-medium ${
              active ? "text-black" : "text-neutral-400"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex-1 text-center py-3 text-xs font-medium text-neutral-400"
      >
        Sign out
      </button>
    </nav>
  );
}
