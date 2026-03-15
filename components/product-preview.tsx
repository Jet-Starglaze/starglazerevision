import SubjectPill from "@/components/subject-pill";

const feedbackPoints = [
  "Evaporation lowers water potential of mesophyll cells.",
  "Water moves from xylem into mesophyll cells by osmosis.",
  "Tension created in xylem.",
  "Cohesion between water molecules maintains continuous column.",
  "Adhesion between water molecules and xylem walls pulls water upward.",
];

export default function ProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-[2.2rem] border border-sky-100/80 bg-white/92 p-4 shadow-[0_30px_90px_-42px_rgba(14,116,144,0.32)] dark:border-white/10 dark:bg-slate-950/68 dark:shadow-[0_36px_96px_-46px_rgba(0,0,0,0.86)] sm:p-6 lg:p-8">
      <div className="absolute inset-x-10 top-0 h-28 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />

      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-sky-100/80 pb-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-300">
              Try again until you get it right.
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              Instant feedback to help you improve.
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <SubjectPill label="A-Level Biology" />
            <SubjectPill label="Transport in cells" />
            <SubjectPill label="6 marks" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.96fr_1.04fr]">
          <article className="rounded-[1.6rem] border border-sky-100 bg-sky-50/75 p-5 dark:border-sky-400/15 dark:bg-sky-400/10">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                Exam-style question
              </p>
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-slate-950/60 dark:text-blue-200">
                6 marks
              </span>
            </div>

            <p className="mt-4 text-base leading-8 text-slate-800 dark:text-white">
              Explain the cohesion-tension mechanism for the movement of water in plants. (6 marks)
            </p>

            
          </article>

          <div className="flex flex-col gap-3">
            <div className="rounded-[1.4rem] border border-sky-100/90 bg-white/92 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                    Mark progression
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {"Answer improved in 2\u20133 iterations."}
                  </p>
                </div>

                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 shadow-inner dark:bg-sky-400/15 dark:text-sky-200">
                  {"\u2197"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">
                  3/6
                </span>
                <span className="text-slate-300 dark:text-slate-600">
                  {"\u2192"}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
                  5/6
                </span>
                <span className="text-sky-300 dark:text-sky-500">
                  {"\u2192"}
                </span>
                <span className="relative inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1 text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.7)]">
                  <span className="absolute inset-0 rounded-full bg-sky-400/35 blur-sm motion-safe:animate-pulse" />
                  <span className="relative">6/6</span>
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <span className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10" />
                <span className="h-1.5 rounded-full bg-sky-300 dark:bg-sky-400/30" />
                <span className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 shadow-[0_8px_18px_-10px_rgba(37,99,235,0.85)]" />
              </div>
            </div>

            <article className="rounded-[1.35rem] border border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Initial answer
                </p>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                  3/6
                </span>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                water evaporates from the leaves and this pulls water up the plant. water sticks together and moves up the xylem.
              </p>
            </article>

            <article className="rounded-[1.35rem] border border-blue-100/90 bg-blue-50/85 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200">
                  Feedback
                </p>
                <p className="mt-2 text-base font-semibold text-slate-950 dark:text-white">
                  Missing points to reach full marks
                </p>
              </div>

              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {feedbackPoints.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-blue-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[1.35rem] border border-sky-200/80 bg-[linear-gradient(180deg,rgba(240,249,255,0.96),rgba(255,255,255,0.98))] p-4 shadow-[0_18px_40px_-30px_rgba(37,99,235,0.38)] dark:border-sky-400/20 dark:bg-[linear-gradient(180deg,rgba(14,29,47,0.92),rgba(7,18,31,0.92))]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
                  Improved answer
                </p>
                <span className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.75)]">
                  6/6
                </span>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-100">
                Water evaporates from mesophyll cells and diffuses out through the stomata. This lowers the water potential in the mesophyll cells so water moves from the xylem into the mesophyll by osmosis. This creates tension in the xylem which pulls water up the plant. Cohesion between water molecules due to hydrogen bonding maintains a continuous column of water. Adhesion between water molecules and the xylem walls helps pull water upwards.
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
