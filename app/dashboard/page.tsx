import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { createClient } from "@/utils/supabase/server";

type LinkAction = {
  label: string;
  href: string;
  prefetch?: boolean;
  variant?: "primary" | "secondary";
};

type ContinuePracticeItem = {
  id: string;
  subject: string;
  focus: string;
  description: string;
  lastActivity: string;
  action: LinkAction;
  secondaryAction?: LinkAction;
};

type PracticeLaunchItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  action: LinkAction;
};

const PRACTICE_HREF = "/subjects/ocr-a-level-biology-a/practice";

const sectionClassName =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8";

const panelClassName =
  "rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

// TODO: Replace this mock dashboard state with real recent activity / progress data.
const continuePracticeItems: ContinuePracticeItem[] = [
  {
    id: "biology-session",
    subject: "OCR A Level Biology A",
    focus: "Cell structure and eukaryotic cells",
    description:
      "Jump back into the practice workspace to generate a question, answer it, and improve with feedback.",
    lastActivity: "Reviewed eukaryotic cell structure",
    action: {
      label: "Continue practice",
      href: PRACTICE_HREF,
      prefetch: false,
      variant: "primary",
    },
    secondaryAction: {
      label: "Start fresh session",
      href: PRACTICE_HREF,
      prefetch: false,
      variant: "secondary",
    },
  },
];

const practiceLaunchItems: PracticeLaunchItem[] = [
  {
    id: "first-question",
    eyebrow: "Start practice",
    title: "Generate your next question",
    description:
      "Open the workspace, pick a subtopic, and start a question-driven revision run.",
    action: {
      label: "Open practice workspace",
      href: PRACTICE_HREF,
      prefetch: false,
      variant: "primary",
    },
  },
  {
    id: "focus-session",
    eyebrow: "Focused revision",
    title: "Build a short answer-improvement session",
    description:
      "Use the syllabus rail to narrow the session, then work through questions one thread at a time.",
    action: {
      label: "Start practice",
      href: PRACTICE_HREF,
      prefetch: false,
      variant: "secondary",
    },
  },
  {
    id: "improve-answers",
    eyebrow: "Improve answers",
    title: "Practice, review, and redraft",
    description:
      "Stay inside the working question and marking flow instead of branching into unfinished content areas.",
    action: {
      label: "Go to practice",
      href: PRACTICE_HREF,
      prefetch: false,
      variant: "secondary",
    },
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const featuredContinueItem = continuePracticeItems[0];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className={sectionClassName}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
                Practice dashboard
              </p>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Welcome back
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Start practice, answer questions, and improve your next draft
                  without getting pulled into unfinished product areas.
                </p>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Signed in as{" "}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {user.email ?? "Unknown email"}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className={primaryButtonClass}
                href={featuredContinueItem?.action.href ?? PRACTICE_HREF}
                prefetch={featuredContinueItem?.action.prefetch ?? false}
              >
                Continue practice
              </Link>
              <Link
                className={secondaryButtonClass}
                href={PRACTICE_HREF}
                prefetch={false}
              >
                Start new practice session
              </Link>
              <Link
                className={secondaryButtonClass}
                href="/dashboard/stats"
                prefetch={false}
              >
                View statistics
              </Link>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <DashboardSection
            title="Continue practice"
            description="Return to the working practice flow and keep momentum in the next question."
          >
            <div className="space-y-4">
              {continuePracticeItems.map((item) => (
                <article key={item.id} className={panelClassName}>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
                        {item.subject}
                      </p>

                      <div className="space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                          {item.focus}
                        </h2>
                        <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {item.description}
                        </p>
                      </div>

                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        Last activity: {item.lastActivity}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        className={getButtonClass(item.action.variant)}
                        href={item.action.href}
                        prefetch={item.action.prefetch}
                      >
                        {item.action.label}
                      </Link>

                      {item.secondaryAction ? (
                        <Link
                          className={getButtonClass(item.secondaryAction.variant)}
                          href={item.secondaryAction.href}
                          prefetch={item.secondaryAction.prefetch}
                        >
                          {item.secondaryAction.label}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Start a new practice session"
            description="Keep the dashboard focused on question-based revision paths that already work."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {practiceLaunchItems.map((item) => (
                <PracticeLaunchCard key={item.id} {...item} />
              ))}
            </div>
          </DashboardSection>

          <section className={sectionClassName}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Account
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  Session
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Keep logout nearby, but separate from the main study actions
                  so the dashboard stays focused on practice.
                </p>
              </div>

              <div className="shrink-0">
                <LogoutButton />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

type DashboardSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function DashboardSection({
  title,
  description,
  children,
}: DashboardSectionProps) {
  return (
    <section className={sectionClassName}>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function PracticeLaunchCard({
  eyebrow,
  title,
  description,
  action,
}: PracticeLaunchItem) {
  return (
    <article className={`${panelClassName} flex h-full flex-col gap-5`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
          {eyebrow}
        </p>

        <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      <div className="shrink-0">
        <Link
          className={getButtonClass(action.variant)}
          href={action.href}
          prefetch={action.prefetch}
        >
          {action.label}
        </Link>
      </div>
    </article>
  );
}

function getButtonClass(variant: LinkAction["variant"] = "secondary") {
  return variant === "primary" ? primaryButtonClass : secondaryButtonClass;
}
