import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/breadcrumbs";
import HierarchyCard from "@/components/hierarchy-card";
import { getTopicPageData } from "@/lib/subjects";

type TopicPageProps = {
  params: Promise<{
    subjectSlug: string;
    moduleSlug: string;
    topicSlug: string;
  }>;
};

export default async function TopicPage({ params }: TopicPageProps) {
  const { subjectSlug, moduleSlug, topicSlug } = await params;
  const data = await getTopicPageData(subjectSlug, moduleSlug, topicSlug);

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
          { label: data.topic.name },
        ]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
          {data.module.name}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {data.topic.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
          Choose a subtopic to open the full revision page with a short summary,
          key terms, and exam tips.
        </p>
      </section>

      {data.subtopics.length > 0 ? (
        <section className="grid gap-4">
          {data.subtopics.map((subtopic) => (
            <HierarchyCard
              key={subtopic.id}
              description={
                subtopic.summary ?? "Open this subtopic to view revision content."
              }
              eyebrow={subtopic.code}
              footer="Open subtopic"
              href={`/subjects/${data.subject.slug}/${data.module.slug}/${data.topic.slug}/${subtopic.slug}`}
              prefetch={false}
              title={subtopic.name}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          This topic does not have any subtopics yet.
        </section>
      )}
    </div>
  );
}
