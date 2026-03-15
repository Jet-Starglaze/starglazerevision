import Link from "next/link";
import { getAuthNavigationState } from "@/lib/auth-navigation";
import type { NavLinkItem } from "@/lib/navigation";
import MobileMenu from "@/components/mobile-menu";
import ThemeToggle from "@/components/theme-toggle";

const baseNavItems: NavLinkItem[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Why students use it", href: "#why-students-use-it" },
];

export default async function Navbar() {
  const { accountAction, primaryAction } = await getAuthNavigationState();
  const navItems = [...baseNavItems, accountAction];

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <Link
            className="inline-flex min-w-0 items-center gap-3 text-sm font-semibold tracking-[0.18em] text-slate-900 dark:text-white"
            href="/"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white shadow-sm dark:bg-sky-600">
              <StarIcon className="h-4 w-4" />
            </span>
            <span className="truncate">StarglazeRevision</span>
          </Link>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <MobileMenu items={navItems} primaryAction={primaryAction} />
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <nav className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {navItems.map((item) =>
                item.href.startsWith("#") ? (
                  <a
                    key={item.href}
                    className="rounded-xl px-4 py-2 transition hover:bg-slate-100 hover:text-sky-700 dark:hover:bg-slate-900 dark:hover:text-sky-200"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    className="rounded-xl px-4 py-2 transition hover:bg-slate-100 hover:text-sky-700 dark:hover:bg-slate-900 dark:hover:text-sky-200"
                    href={item.href}
                    prefetch={item.prefetch}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>

            <ThemeToggle />

            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-blue-800"
              href={primaryAction.href}
              prefetch={primaryAction.prefetch}
            >
              {primaryAction.label}
            </Link>
          </div>
        </div>
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
