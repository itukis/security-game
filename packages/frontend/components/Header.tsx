"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";

export function Header() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  // Auto-close on md+ so the state matches the visible UI when the viewport
  // crosses the breakpoint (rotation, devtools resize, foldables).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    function syncForViewport() {
      if (mql.matches) setMenuOpen(false);
    }
    syncForViewport();
    mql.addEventListener("change", syncForViewport);
    return () => mql.removeEventListener("change", syncForViewport);
  }, []);

  // Disclosure pattern: Escape closes the drawer.
  useEffect(() => {
    if (!menuOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  // Lock body scroll while the mobile drawer is open so the page underneath
  // does not slide around when the user touches the backdrop.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    try {
      const result = await signOut();
      if (result?.error) {
        throw result.error;
      }
      toast.info("ログアウトしました");
      router.push("/login");
    } catch (err) {
      const detail =
        err instanceof Error && err.message ? `: ${err.message}` : "";
      toast.error(`ログアウトに失敗しました${detail}`);
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const linkClass =
    "rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100";
  const mobileLinkClass =
    "block rounded border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const mobileLogoutClass =
    "block w-full rounded border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-left text-rose-100 transition hover:border-rose-300/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

  return (
    <>
      <header className="relative z-40 border-b border-cyan-300/15 bg-zinc-950/90 text-zinc-100 shadow-lg shadow-black/25">
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3" onClick={closeMenu}>
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

          <nav
            aria-label="主要メニュー"
            className="hidden items-center gap-2 text-sm font-bold md:flex"
          >
            <Link href="/glossary" className={linkClass}>
              Words and Quiz
            </Link>
            {user ? (
              <>
                <Link href="/challenges" className={linkClass}>
                  Challenges
                </Link>
                <Link href="/dashboard" className={linkClass}>
                  Dashboard
                </Link>
                <Link href="/leaderboard" className={linkClass}>
                  Leaderboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-rose-100 transition hover:border-rose-300/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass}>
                  Login
                </Link>
                <Link href="/signup" className={linkClass}>
                  Sign up
                </Link>
                <Link href="/challenges" className={linkClass}>
                  Challenges
                </Link>
                <Link href="/leaderboard" className={linkClass}>
                  Leaderboard
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            aria-expanded={menuOpen}
            {...(menuOpen ? { "aria-controls": "mobile-nav" } : {})}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded border border-zinc-700 bg-zinc-900 text-xl text-zinc-200 transition hover:border-cyan-300/60 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 md:hidden"
          >
            <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={closeMenu}
            className="fixed inset-x-0 bottom-0 top-[76px] z-30 cursor-default bg-black/50 backdrop-blur-[2px] md:hidden"
          />
          <nav
            id="mobile-nav"
            aria-label="モバイルメニュー"
            className="fixed inset-x-0 top-[76px] z-40 grid max-h-[calc(100dvh-76px)] gap-2 overflow-y-auto border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-bold shadow-2xl shadow-black/60 md:hidden"
          >
            <Link href="/glossary" onClick={closeMenu} className={mobileLinkClass}>
              Words
            </Link>
            {user ? (
              <>
                <Link href="/challenges" onClick={closeMenu} className={mobileLinkClass}>
                  Challenges
                </Link>
                <Link href="/dashboard" onClick={closeMenu} className={mobileLinkClass}>
                  Dashboard
                </Link>
                <Link href="/leaderboard" onClick={closeMenu} className={mobileLinkClass}>
                  Leaderboard
                </Link>
                <button type="button" onClick={handleLogout} className={mobileLogoutClass}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMenu} className={mobileLinkClass}>
                  Login
                </Link>
                <Link href="/signup" onClick={closeMenu} className={mobileLinkClass}>
                  Sign up
                </Link>
                <Link href="/challenges" onClick={closeMenu} className={mobileLinkClass}>
                  Challenges
                </Link>
                <Link href="/leaderboard" onClick={closeMenu} className={mobileLinkClass}>
                  Leaderboard
                </Link>
              </>
            )}
          </nav>
        </>
      ) : null}
    </>
  );
}
