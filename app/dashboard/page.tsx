import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              StarglazeRevision
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Dashboard
            </h1>
            <p className="text-base text-slate-700 dark:text-slate-200">
              Signed in as{" "}
              <span className="font-semibold text-slate-950 dark:text-white">
                {user.email ?? "Unknown email"}
              </span>
            </p>
            <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
              Welcome back. Browse the first revision subject and move through
              the content structure from module to subtopic.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-blue-800"
              href="/subjects"
            >
              Browse subjects
            </Link>
            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
