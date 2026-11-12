"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";

export function SiteHeader() {
  const pathname = usePathname();
  const me = useQuery(api.users.me);

  // Full-bleed map owns its own chrome (Google/Apple style).
  if (pathname === "/map" || pathname?.startsWith("/map/")) {
    return null;
  }

  const showAdmin = me?.role === "admin";

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--paper)]/90 px-4 backdrop-blur">
      <nav className="flex items-center gap-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)] transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Happy Parent
        </Link>
        <Link
          href="/map"
          className="rounded-md px-1.5 py-1 text-sm text-[var(--ink-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Map
        </Link>
        {showAdmin ? (
          <Link
            href="/admin"
            className="rounded-md px-1.5 py-1 text-sm text-[var(--ink-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Admin
          </Link>
        ) : null}
      </nav>
      <div className="flex items-center gap-3">
        <Show when="signed-out" fallback={<UserButton />}>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign in
            </button>
          </SignInButton>
        </Show>
      </div>
    </header>
  );
}
