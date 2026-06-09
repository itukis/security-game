"use client";

import Link from "next/link";
import { Header } from "@/components/Header";

export function SupabaseRequiredNotice() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="min-h-screen bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.05)_1px,transparent_1px)] bg-[size:34px_34px]">
        <Header />
        <section className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-3xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl shadow-black/40">
            <h1 className="text-2xl font-black text-white">
              This feature requires Supabase configuration.
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              In demo mode, try the learning flow from the challenge list.
            </p>
            <Link
              href="/challenges"
              className="mt-5 inline-flex h-11 items-center justify-center rounded border border-cyan-300/70 bg-cyan-300 px-4 text-sm font-black text-zinc-950 transition hover:bg-cyan-200"
            >
              Go to Challenges →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
