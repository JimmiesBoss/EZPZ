"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-3xl font-bold mb-2">EZPZ</h1>
      <p className="text-gray-500 mb-8">Voice-to-action, made simple.</p>
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="bg-black text-white rounded-full px-8 py-3 text-base font-medium active:scale-95 transition-transform"
      >
        Sign in with Google
      </button>
    </div>
  );
}
