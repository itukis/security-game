"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();

  async function handleLogout() {
    await signOut();
    toast.info("ログアウトしました");
    router.push("/login");
  }

  return (
    <header className="border-b border-cyan-300/15 bg-zinc-950/90 text-zinc-100 shadow-lg shadow-black/25">
      <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded border border-cyan-300/50 bg-cyan-300/10 font-black text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.18)]">
            SQ
          </span>
          <span>
            <span className="block text-base font-black tracking-tight text-white">
              SecurePatch Quest
            </span>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 group-hover:text-cyan-200">
              White Hat Training
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-sm font-bold">
          <Link
            href="/challenges"
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
          >
            Challenges
          </Link>
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
              >
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
              >
                Leaderboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-rose-100 transition hover:border-rose-300/70 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
              >
                Sign up
              </Link>
              <Link
                href="/leaderboard"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100"
              >
                Leaderboard
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
