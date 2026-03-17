import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Breadcrumbs from "@/components/breadcrumbs";
import PracticeWorkspace from "@/components/practice-workspace";
import { BIOLOGY_PRACTICE_SUBJECT_SLUG } from "@/lib/mock-biology-practice";
import { getPracticeSyllabusData, getSubjectPageData } from "@/lib/subjects";
import { createClient } from "@/utils/supabase/server";

type PracticePageProps = {
  params: Promise<{
    subjectSlug: string;
  }>;
};

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

export default async function PracticePage({ params }: PracticePageProps) {
  const { subjectSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getSubjectPageData(subjectSlug, supabase);

  if (!data) {
    notFound();
  }

  const isSupportedSubject =
    data.subject.slug === BIOLOGY_PRACTICE_SUBJECT_SLUG;

  if (isSupportedSubject) {
    const practiceModules = await getPracticeSyllabusData(subjectSlug, supabase);

    return (
      <div className="relative left-1/2 -my-8 w-screen -translate-x-1/2">
        <PracticeWorkspace
          modules={practiceModules}
          subjectName={data.subject.name}
          subjectSlug={data.subject.slug}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Subjects", href: "/subjects", prefetch: true },
          {
            label: data.subject.name,
            href: `/subjects/${data.subject.slug}`,
            prefetch: true,
          },
          { label: "Practice questions" },
        ]}
      />

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
          {data.subject.name}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Practice questions
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
          Practice questions for this subject are coming soon. For now, keep
          using the revision library while the first practice workspace is
          focused on Biology.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className={primaryButtonClass}
            href={`/subjects/${data.subject.slug}`}
            prefetch
          >
            Back to subject
          </Link>
          <Link className={secondaryButtonClass} href="/dashboard" prefetch>
            Return to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
