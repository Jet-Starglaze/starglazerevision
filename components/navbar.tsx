import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-full border border-white/60 bg-white/72 px-4 py-3 shadow-[0_20px_60px_-36px_rgba(91,33,182,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_20px_60px_-36px_rgba(0,0,0,0.8)]">
        <Link
          className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-slate-900 dark:text-white"
          href="/"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
            <StarIcon className="h-4 w-4" />
          </span>
          <span>StarglazeRevision</span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center justify-end gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <a
            className="rounded-full px-3 py-2 transition hover:text-purple-700 dark:hover:text-purple-200"
            href="#features"
          >
            Features
          </a>
          <a
            className="rounded-full px-3 py-2 transition hover:text-purple-700 dark:hover:text-purple-200"
            href="#how-it-works"
          >
            How it works
          </a>
          <Link
            className="rounded-full px-3 py-2 transition hover:text-purple-700 dark:hover:text-purple-200"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-5 py-2.5 text-white shadow-lg shadow-purple-500/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-500/30"
            href="/login"
          >
            Start Revising
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="m12 3.75 2.22 4.5 4.97.72-3.6 3.5.85 4.94L12 15.08l-4.44 2.33.85-4.94-3.6-3.5 4.97-.72L12 3.75Z" />
    </svg>
  );
}
