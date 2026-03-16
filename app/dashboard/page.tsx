import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import FriendsDrawer from "@/components/friends-drawer";
import LogoutButton from "@/components/logout-button";
import { createClient } from "@/utils/supabase/server";

type LinkAction = {
  label: string;
  href: string;
  prefetch?: boolean;
  variant?: "primary" | "secondary";
};

type ContinueRevisionItem = {
  id: string;
  subject: string;
  module: string;
  topic: string;
  description: string;
  lastActivity: string;
  href: string;
  practiceHref: string;
  subjectHref: string;
};

type SubjectItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  primaryAction: LinkAction;
  secondaryAction?: LinkAction;
};

type ActionItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  action: LinkAction;
};

const sectionClassName =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8";

const panelClassName =
  "rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

// TODO: Replace this mock dashboard state with real recent activity / progress data.
const continueRevisionItems: ContinueRevisionItem[] = [
  {
    id: "biology-continue",
    subject: "OCR A Level Biology A",
    module: "Module 2: Cell structure",
    topic: "Topic: Cell structure -> Eukaryotic cell structure",
    description:
      "Pick up with organelles, cell functions, and revision-ready explanations for exam questions.",
    lastActivity: "Reviewed eukaryotic cell structure",
    href: "/subjects/ocr-a-level-biology-a/module-2/cell-structure/eukaryotic-cell-structure",
    practiceHref: "/subjects/ocr-a-level-biology-a/practice",
    subjectHref: "/subjects/ocr-a-level-biology-a",
  },
];

const subjects: SubjectItem[] = [
  {
    id: "ocr-biology",
    eyebrow: "OCR / A Level",
    title: "OCR A Level Biology A",
    description:
      "Open the current Biology library and move from modules into topics and subtopics.",
    primaryAction: {
      label: "Open subject",
      href: "/subjects/ocr-a-level-biology-a",
      prefetch: true,
      variant: "primary",
    },
    secondaryAction: {
      label: "Start practice",
      href: "/subjects/ocr-a-level-biology-a/module-2/cell-structure",
      prefetch: true,
      variant: "secondary",
    },
  },
  {
    id: "psychology",
    eyebrow: "A Level / Placeholder",
    title: "A Level Psychology",
    description:
      "Keep this visible on the dashboard now, then swap in the real Psychology subject route when that content is ready.",
    badge: "Coming soon",
    primaryAction: {
      label: "Open subject",
      href: "/subjects",
      prefetch: true,
      variant: "secondary",
    },
  },
];

const quickPracticeActions: ActionItem[] = [
  {
    id: "six-marker",
    eyebrow: "Short session",
    title: "Practice a 6-marker",
    description:
      "Jump into a focused Biology subtopic and use it like a quick written-answer starting point.",
    action: {
      label: "Start practice",
      href: "/subjects/ocr-a-level-biology-a/module-2/cell-structure/eukaryotic-cell-structure",
      prefetch: false,
      variant: "primary",
    },
  },
  {
    id: "mixed-biology",
    eyebrow: "Mixed practice",
    title: "Mixed Biology practice",
    description:
      "Open the Biology subject page and choose a module or topic to keep your revision moving.",
    action: {
      label: "Open Biology",
      href: "/subjects/ocr-a-level-biology-a",
      prefetch: true,
      variant: "secondary",
    },
  },
  {
    id: "long-answer",
    eyebrow: "Long answers",
    title: "Long-answer practice",
    description:
      "Use the library as your route into broader topics when you want a deeper revision session.",
    action: {
      label: "Browse topics",
      href: "/subjects",
      prefetch: true,
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

  const featuredContinueItem = continueRevisionItems[0];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className={sectionClassName}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
                Revision dashboard
              </p>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Welcome back
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Use your dashboard to jump back into practice, open one of
                  your subjects, or browse the full revision library.
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
                href={featuredContinueItem?.href ?? "/subjects"}
                prefetch={false}
              >
                Continue revision
              </Link>
              <Link
                className={secondaryButtonClass}
                href="/subjects"
                prefetch
              >
                Browse library
              </Link>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <DashboardSection
            title="Continue revision"
            description="Pick up where you left off with a simple, editable placeholder for future progress data."
          >
            <div className="space-y-4">
              {continueRevisionItems.map((item) => (
                <article key={item.id} className={panelClassName}>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
                        {item.subject}
                      </p>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                          {item.module}
                        </h3>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {item.topic}
                        </p>
                      </div>

                      <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {item.description}
                      </p>

                      <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        Last activity: {item.lastActivity}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        className={primaryButtonClass}
                        href={item.href}
                        prefetch={false}
                      >
                        Continue revision
                      </Link>
                      <Link
                        className={secondaryButtonClass}
                        href={item.practiceHref}
                        prefetch
                      >
                        Practice questions
                      </Link>
                      <Link
                        className={secondaryButtonClass}
                        href={item.subjectHref}
                        prefetch
                      >
                        Open subject
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Your subjects"
            description="Keep your main courses close so you can get back into revision quickly."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {subjects.map((subject) => (
                <SubjectCard key={subject.id} {...subject} />
              ))}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Quick practice"
            description="Use a shorter action card when you want to start revising without browsing around first."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              {quickPracticeActions.map((actionItem) => (
                <ActionCard key={actionItem.id} {...actionItem} />
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
                  Keep logout nearby, but separate from the main revision
                  actions so starting a study session stays the focus.
                </p>
              </div>

              <div className="shrink-0">
                <LogoutButton />
              </div>
            </div>
          </section>
        </div>
      </div>

      <FriendsDrawer />
    </main>
  );
}

type DashboardSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
  note?: string;
};

function DashboardSection({
  title,
  description,
  children,
  note,
}: DashboardSectionProps) {
  return (
    <section className={sectionClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>

        {note ? (
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {note}
          </span>
        ) : null}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function SubjectCard({
  eyebrow,
  title,
  description,
  badge,
  primaryAction,
  secondaryAction,
}: SubjectItem) {
  return (
    <article className={`${panelClassName} flex h-full flex-col gap-5 lg:flex-row lg:items-center lg:justify-between`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
            {eyebrow}
          </p>
          {badge ? (
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {badge}
            </span>
          ) : null}
        </div>

        <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>

        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        <Link
          className={getButtonClass(primaryAction.variant)}
          href={primaryAction.href}
          prefetch={primaryAction.prefetch}
        >
          {primaryAction.label}
        </Link>

        {secondaryAction ? (
          <Link
            className={getButtonClass(secondaryAction.variant)}
            href={secondaryAction.href}
            prefetch={secondaryAction.prefetch}
          >
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function ActionCard({ eyebrow, title, description, action }: ActionItem) {
  return (
    <article className={`${panelClassName} flex h-full flex-col gap-5 lg:flex-row lg:items-center lg:justify-between`}>
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
