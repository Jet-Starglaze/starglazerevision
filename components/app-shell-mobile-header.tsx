"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileMenu from "@/components/mobile-menu";
import ThemeToggle from "@/components/theme-toggle";
import type { NavLinkItem } from "@/lib/navigation";

type AppShellMobileHeaderProps = {
  navigationItems: NavLinkItem[];
  primaryAction: NavLinkItem;
};

const mobilePrimaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500";

export default function AppShellMobileHeader({
  navigationItems,
  primaryAction,
}: AppShellMobileHeaderProps) {
  const pathname = usePathname();
  const isPracticeRoute = isMobilePracticeRoute(pathname);
  const rowClassName = isPracticeRoute
    ? "flex items-center justify-between gap-3 py-2.5"
    : "flex flex-wrap items-center justify-between gap-3 py-3";

  return (
    <div className="md:hidden">
      <div className={rowClassName}>
        <Link
          className="inline-flex min-w-0 items-center gap-3 text-sm font-semibold tracking-[0.18em] text-slate-900 dark:text-white"
          href="/"
          prefetch
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white shadow-sm dark:bg-sky-600">
            <StarIcon className="h-4 w-4" />
          </span>
          <span className="truncate">StarglazeRevision</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {isPracticeRoute ? (
            <MobileMenu items={navigationItems} />
          ) : (
            <Link
              className={mobilePrimaryButtonClass}
              href={primaryAction.href}
              prefetch={primaryAction.prefetch}
            >
              Practice
            </Link>
          )}
        </div>
      </div>

      {!isPracticeRoute ? (
        <div className="flex border-t border-slate-200/70 pb-3 pt-2 dark:border-slate-800/70">
          <nav className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            {navigationItems.map((item) => (
              <Link
                className="rounded-xl px-3 py-2 transition hover:bg-slate-100 hover:text-sky-700 dark:hover:bg-slate-900 dark:hover:text-sky-200"
                href={item.href}
                key={`${item.href}-${item.label}`}
                prefetch={item.prefetch}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

function isMobilePracticeRoute(pathname: string | null) {
  return pathname ? /^\/subjects\/[^/]+\/practice\/?$/.test(pathname) : false;
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
