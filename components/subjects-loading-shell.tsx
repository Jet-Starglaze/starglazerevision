type SubjectsLoadingShellProps = {
  cardCount?: number;
  cardLayout?: "grid" | "stack";
  showDetailPanels?: boolean;
};

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`rounded-xl bg-slate-200/80 dark:bg-slate-800/80 ${className}`}
    />
  );
}

export default function SubjectsLoadingShell({
  cardCount = 2,
  cardLayout = "grid",
  showDetailPanels = false,
}: SubjectsLoadingShellProps) {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-4 w-3" />
        <SkeletonBlock className="h-4 w-36" />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-4 h-10 w-72 max-w-full" />
        <div className="mt-4 space-y-3">
          <SkeletonBlock className="h-4 w-full max-w-2xl" />
          <SkeletonBlock className="h-4 w-full max-w-xl" />
        </div>
      </section>

      <section
        className={
          cardLayout === "grid" ? "grid gap-4 md:grid-cols-2" : "grid gap-4"
        }
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="mt-4 h-7 w-56 max-w-full" />
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-5/6" />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-6" />
            </div>
          </article>
        ))}
      </section>

      {showDetailPanels ? (
        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <SkeletonBlock className="h-4 w-24" />
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-4/5" />
            </div>
          </article>

          <div className="grid gap-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <SkeletonBlock className="h-4 w-28" />
              <div className="mt-4 flex flex-wrap gap-2">
                <SkeletonBlock className="h-8 w-24 rounded-full" />
                <SkeletonBlock className="h-8 w-28 rounded-full" />
                <SkeletonBlock className="h-8 w-20 rounded-full" />
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <SkeletonBlock className="h-4 w-24" />
              <div className="mt-4 space-y-3">
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-11/12" />
                <SkeletonBlock className="h-4 w-10/12" />
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
