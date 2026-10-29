"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--line)] bg-[var(--paper)]/90 px-4 backdrop-blur">
      <nav className="flex items-center gap-5">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]"
        >
          Happy Parent
        </Link>
        <Link
          href="/map"
          className="text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
        >
          Map
        </Link>
        <Show when="signed-in">
          <Link
            href="/admin"
            className="text-sm text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
          >
            Admin
          </Link>
        </Show>
      </nav>
      <div className="flex items-center gap-3">
        <Show
          when="signed-out"
          fallback={<UserButton />}
        >
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              Sign in
            </button>
          </SignInButton>
        </Show>
      </div>
    </header>
  );
}
