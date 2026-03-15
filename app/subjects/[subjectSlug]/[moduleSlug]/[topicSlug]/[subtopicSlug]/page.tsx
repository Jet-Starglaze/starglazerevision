import { notFound, redirect } from "next/navigation";
import Breadcrumbs from "@/components/breadcrumbs";
import { getSubtopicPageData } from "@/lib/subjects";
import { createClient } from "@/utils/supabase/server";

type SubtopicPageProps = {
  params: Promise<{
    subjectSlug: string;
    moduleSlug: string;
    topicSlug: string;
    subtopicSlug: string;
  }>;
};

export default async function SubtopicPage({ params }: SubtopicPageProps) {
  const { subjectSlug, moduleSlug, topicSlug, subtopicSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await getSubtopicPageData(
    subjectSlug,
    moduleSlug,
    topicSlug,
    subtopicSlug,
    supabase,
  );

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Subjects", href: "/subjects", prefetch: true },
          {
            label: data.subject.name,
            href: `/subjects/${data.subject.slug}`,
            prefetch: true,
          },
          {
            label: data.module.name,
            href: `/subjects/${data.subject.slug}/${data.module.slug}`,
            prefetch: true,
          },
          {
            label: data.topic.name,
            href: `/subjects/${data.subject.slug}/${data.module.slug}/${data.topic.slug}`,
            prefetch: true,
          },
          { label: data.subtopic.name },
        ]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
              {data.subject.name}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-900">
                {data.module.name}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-700 dark:bg-slate-900">
                {data.topic.name}
              </span>
            </div>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {data.subtopic.code}
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {data.subtopic.name}
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
              {data.subtopic.summary}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900 lg:w-72">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Ready for the next step?
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Question practice will plug into this page next.
            </p>
            <button
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400"
              disabled
              type="button"
            >
              Start question
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
            Summary
          </p>
          <p className="mt-4 text-base leading-8 text-slate-700 dark:text-slate-200">
            {data.subtopic.summary}
          </p>
        </article>

        <div className="grid gap-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
              Key terms
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.subtopic.keyTerms.map((term) => (
                <span
                  key={term}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {term}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
              Exam tips
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
              {data.subtopic.examTips.map((tip) => (
                <li key={tip} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-600 dark:bg-sky-300" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
