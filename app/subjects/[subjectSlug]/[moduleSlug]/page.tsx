import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/breadcrumbs";
import HierarchyCard from "@/components/hierarchy-card";
import { getModulePageData } from "@/lib/subjects";

type ModulePageProps = {
  params: Promise<{
    subjectSlug: string;
    moduleSlug: string;
  }>;
};

export default async function ModulePage({ params }: ModulePageProps) {
  const { subjectSlug, moduleSlug } = await params;
  const data = await getModulePageData(subjectSlug, moduleSlug);

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
          { label: data.module.name },
        ]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
          {data.subject.name}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {data.module.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
          Work through the topics in this module to build a structured revision
          path.
        </p>
      </section>

      {data.topics.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {data.topics.map((topic) => (
            <HierarchyCard
              key={topic.id}
              description="Open this topic to view all revision subtopics."
              eyebrow={`Topic ${topic.orderNumber}`}
              footer="View topic"
              href={`/subjects/${data.subject.slug}/${data.module.slug}/${topic.slug}`}
              prefetch
              title={topic.name}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          This module does not have any topics yet.
        </section>
      )}
    </div>
  );
}
