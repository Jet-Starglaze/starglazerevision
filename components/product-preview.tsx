import SubjectPill from "@/components/subject-pill";

export default function ProductPreview() {
  return (
    <div className="relative overflow-hidden rounded-[2.2rem] border border-sky-100/80 bg-white/92 p-4 shadow-[0_30px_90px_-42px_rgba(14,116,144,0.32)] dark:border-white/10 dark:bg-slate-950/68 dark:shadow-[0_36px_96px_-46px_rgba(0,0,0,0.86)] sm:p-6 lg:p-8">
      <div className="absolute inset-x-10 top-0 h-28 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />

      <div className="relative">
        <div className="flex flex-col gap-4 border-b border-sky-100/80 pb-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-300">
              Product in action
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              A real question. A real answer. Clear feedback.
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <SubjectPill label="A-Level Biology" />
            <SubjectPill label="Transport in cells" />
            <SubjectPill label="6 marks" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr_1fr]">
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
              Explain how the structure of the small intestine helps it absorb
              digested food efficiently.
            </p>

            <div className="mt-5 rounded-[1.2rem] border border-white/80 bg-white/80 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
              Focus on structure, surface area, and why absorption can happen
              quickly.
            </div>
          </article>

          <article className="rounded-[1.6rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Student answer
            </p>

            <div className="mt-4 rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-slate-950/30">
              <p className="text-sm leading-8 text-slate-700 dark:text-slate-200">
                The small intestine has a large surface area so more digested
                food can be absorbed at once. It also has a good blood supply,
                which helps keep the concentration gradient high for
                absorption.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <SubjectPill
                className="border-transparent bg-slate-100 text-slate-600 shadow-none dark:bg-white/[0.05] dark:text-slate-300"
                label="Clear opening point"
              />
              <SubjectPill
                className="border-transparent bg-slate-100 text-slate-600 shadow-none dark:bg-white/[0.05] dark:text-slate-300"
                label="Needs one more detail"
              />
            </div>
          </article>

          <article className="rounded-[1.6rem] border border-blue-100/90 bg-blue-50/85 p-5 dark:border-blue-400/20 dark:bg-blue-400/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-200">
                  Feedback
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                  Estimated mark: 4/6
                </p>
              </div>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-slate-950/55 dark:text-blue-200">
                What to improve
              </span>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  What was strong
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-300" />
                    You linked large surface area to faster absorption.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-300" />
                    You explained why blood supply helps maintain the
                    concentration gradient.
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Missing points
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-slate-300" />
                    Add villi and microvilli to explain how the surface area is
                    increased.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-slate-300" />
                    Mention the thin epithelial wall so diffusion distance is
                    short.
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.2rem] border border-sky-100 bg-white/90 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-white">
              Question
            </p>
            <p className="mt-2 leading-6">
              Real exam-style prompt with a clear mark value.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-sky-100 bg-white/90 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-white">
              Answer
            </p>
            <p className="mt-2 leading-6">
              Student response shown the way revision practice actually feels.
            </p>
          </div>

          <div className="rounded-[1.2rem] border border-sky-100 bg-white/90 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-white">
              Feedback
            </p>
            <p className="mt-2 leading-6">
              Strong points, missing points, and a clearer next step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
