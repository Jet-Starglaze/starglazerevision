import Link from "next/link";
import { getAuthNavigationState } from "@/lib/auth-navigation";
import type { NavLinkItem } from "@/lib/navigation";
import AppShellMobileHeader from "@/components/app-shell-mobile-header";
import ThemeToggle from "@/components/theme-toggle";

const desktopPrimaryButtonClass =
  "hidden min-h-10 items-center justify-center rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500 md:inline-flex";

export default async function AppShellNavbar() {
  const { accountAction, primaryAction } = await getAuthNavigationState();
  const navigationItems = getAppShellNavigationItems(accountAction);
  const accountButton =
    navigationItems.some((item) => item.href === accountAction.href)
      ? null
      : accountAction;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/86 shadow-sm shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/84 dark:shadow-black/20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AppShellMobileHeader
          navigationItems={navigationItems}
          primaryAction={primaryAction}
        />

        <div className="hidden items-center justify-between gap-3 py-3 md:flex">
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

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-200 md:flex">
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

          <div className="flex items-center gap-2">
            {accountButton ? (
              <Link
                className="hidden min-h-10 items-center justify-center rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200 lg:inline-flex"
                href={accountButton.href}
                prefetch={accountButton.prefetch}
              >
                {accountButton.label}
              </Link>
            ) : null}
            <ThemeToggle />
            <Link
              className={desktopPrimaryButtonClass}
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

function getAppShellNavigationItems(accountAction: NavLinkItem) {
  const baseItems: NavLinkItem[] = [
    { label: "Dashboard", href: "/dashboard", prefetch: true },
    { label: "Subjects", href: "/subjects", prefetch: true },
  ];

  if (baseItems.some((item) => item.href === accountAction.href)) {
    return baseItems;
  }

  return [...baseItems, accountAction];
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
