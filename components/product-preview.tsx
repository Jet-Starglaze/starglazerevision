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
    <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-6 lg:p-8">
      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
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
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                Exam-style question
              </p>
              <span className="rounded-xl border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-blue-200">
                6 marks
              </span>
            </div>

            <p className="mt-4 text-base leading-8 text-slate-800 dark:text-white">
              Explain the cohesion-tension mechanism for the movement of water in plants. (6 marks)
            </p>

            
          </article>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                    Mark progression
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {"Answer improved in 2\u20133 iterations."}
                  </p>
                </div>

                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-sky-200">
                  {"\u2197"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold">
                <span className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  2/6
                </span>
                <span className="text-slate-300 dark:text-slate-600">
                  {"\u2192"}
                </span>
                <span className="rounded-xl border border-sky-200 bg-sky-100 px-3 py-1 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
                  5/6
                </span>
                <span className="text-sky-300 dark:text-sky-500">
                  {"\u2192"}
                </span>
                <span className="inline-flex items-center rounded-xl border border-sky-700 bg-sky-700 px-3 py-1 text-white dark:border-sky-500 dark:bg-sky-600">
                  6/6
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <span className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                <span className="h-1.5 rounded-full bg-sky-200 dark:bg-sky-900" />
                <span className="h-1.5 rounded-full bg-sky-700 dark:bg-sky-600" />
              </div>
            </div>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  Initial answer
                </p>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  2/6
                </span>
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                water evaporates from the leaves and this pulls water up the plant. water sticks together and moves up the xylem.
              </p>
            </article>

            <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-900 dark:bg-slate-900">
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

            <article className="rounded-2xl border border-sky-300 bg-white p-4 shadow-sm dark:border-sky-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
                  Improved answer
                </p>
                <span className="rounded-xl bg-sky-700 px-3 py-1 text-xs font-semibold text-white dark:bg-sky-600">
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
