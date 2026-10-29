import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,#d8e8d4_0%,transparent_55%),radial-gradient(ellipse_at_90%_80%,#e7dcc8_0%,transparent_50%),linear-gradient(165deg,#f4efe6_0%,#e8f0e4_48%,#dfe9e2_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:url('data:image/svg+xml,%3Csvg_xmlns=%22http://www.w3.org/2000/svg%22_width=%2280%22_height=%2280%22%3E%3Cpath_d=%22M0_40h80M40_0v80%22_stroke=%22%231f4d3a%22_stroke-opacity=%220.06%22_stroke-width=%221%22/%3E%3C/svg%3E')]"
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="animate-[fade-up_0.7s_ease_both] font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-[var(--ink)] sm:text-7xl md:text-8xl">
          Happy Parent
        </p>
        <h1 className="mt-6 max-w-xl animate-[fade-up_0.8s_ease_0.08s_both] text-2xl font-medium leading-snug text-[var(--ink)] sm:text-3xl">
          A public map of family places in Warsaw.
        </h1>
        <p className="mt-4 max-w-md animate-[fade-up_0.8s_ease_0.16s_both] text-base leading-relaxed text-[var(--ink-muted)]">
          Browse playgrounds, parks, cafes, and more — filter in the browser,
          open a pin, plan the afternoon.
        </p>
        <div className="mt-10 flex animate-[fade-up_0.85s_ease_0.24s_both] flex-wrap gap-3">
          <Link
            href="/map"
            className="rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:brightness-110"
          >
            Open the map
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md bg-white/70 px-5 py-3 text-sm font-medium text-[var(--ink)] ring-1 ring-[var(--line)] transition hover:bg-white"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
