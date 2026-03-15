import Link from "next/link";
import { getAuthNavigationState } from "@/lib/auth-navigation";
import ThemeToggle from "@/components/theme-toggle";

export default async function SubjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { accountAction, isAuthenticated, primaryAction } =
    await getAuthNavigationState();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <Link
              className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
              href="/"
            >
              StarglazeRevision
            </Link>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Revision library
            </p>
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <Link
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-sky-200"
              href="/subjects"
              prefetch
            >
              Subjects
            </Link>
            <Link
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-sky-200"
              href={accountAction.href}
              prefetch={accountAction.prefetch}
            >
              {accountAction.label}
            </Link>
            {!isAuthenticated ? (
              <Link
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200"
                href={primaryAction.href}
                prefetch={primaryAction.prefetch}
              >
                {primaryAction.label}
              </Link>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
