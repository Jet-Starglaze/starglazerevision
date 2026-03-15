import HierarchyCard from "@/components/hierarchy-card";
import { getSubjects } from "@/lib/subjects";

export default async function SubjectsPage() {
  const subjects = await getSubjects();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
          Revision library
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Browse subjects
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
          Pick a subject, move through the module and topic structure, and
          drill down into revision-ready subtopics.
        </p>
      </section>

      {subjects.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {subjects.map((subject) => (
            <HierarchyCard
              key={subject.id}
              description="Browse modules, topics, and subtopics for this course."
              eyebrow={`${subject.examBoard} / ${subject.qualification}`}
              footer="View subject"
              href={`/subjects/${subject.slug}`}
              prefetch
              title={subject.name}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          No subjects are available yet.
        </section>
      )}
    </div>
  );
}
