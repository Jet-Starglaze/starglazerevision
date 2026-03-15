import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/breadcrumbs";
import HierarchyCard from "@/components/hierarchy-card";
import { getSubjectPageData } from "@/lib/subjects";

type SubjectPageProps = {
  params: Promise<{
    subjectSlug: string;
  }>;
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { subjectSlug } = await params;
  const data = await getSubjectPageData(subjectSlug);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Subjects", href: "/subjects", prefetch: true },
          { label: data.subject.name },
        ]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
          {data.subject.examBoard} {data.subject.qualification}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {data.subject.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
          Choose a module to start navigating the course in a clear revision
          order.
        </p>
      </section>

      {data.modules.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {data.modules.map((module) => (
            <HierarchyCard
              key={module.id}
              description="Open this module to browse its topics."
              eyebrow={`Module ${module.orderNumber}`}
              footer="View module"
              href={`/subjects/${data.subject.slug}/${module.slug}`}
              prefetch
              title={module.name}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          This subject does not have any modules yet.
        </section>
      )}
    </div>
  );
}
