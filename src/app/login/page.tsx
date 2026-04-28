"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Widgeter</h1>
          <p className="mt-2 text-sm text-neutral-600">
            AI-powered Parts Finder. Sign in to start a hunt.
          </p>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/requests" })}
          className="w-full bg-black text-white rounded-full py-3 text-base font-medium active:scale-95 transition-transform"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
