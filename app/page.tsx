import Link from "next/link";
import FeatureCard from "@/components/feature-card";
import Navbar from "@/components/navbar";

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-purple-500/25 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-purple-500/30";

const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-slate-300/80 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-800 backdrop-blur transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-purple-400/40 dark:hover:bg-white/[0.08]";

const features = [
  {
    title: "Practice exam questions",
    description:
      "Revise with focused prompts that feel like the questions you will face under exam pressure, so every session builds real confidence.",
    icon: <PracticeIcon className="h-5 w-5" />,
  },
  {
    title: "Instant feedback",
    description:
      "See what is working, what is missing, and what to improve next without waiting around for marked answers.",
    icon: <FeedbackIcon className="h-5 w-5" />,
  },
  {
    title: "Improve faster",
    description:
      "Spot weak patterns early, tighten your explanations, and spend more time making progress instead of rereading notes.",
    icon: <ProgressIcon className="h-5 w-5" />,
  },
];

const steps = [
  {
    number: "01",
    title: "Choose a subject",
    description:
      "Start with the topic you need most, whether you are patching weak areas or sharpening before a mock.",
  },
  {
    number: "02",
    title: "Answer exam questions",
    description:
      "Work through exam-style prompts that push you to explain, apply knowledge, and structure stronger responses.",
  },
  {
    number: "03",
    title: "Get instant feedback",
    description:
      "See clear feedback straight away so you know what to fix, what to keep, and how to earn stronger marks next time.",
  },
];

const sessionStats = [
  { label: "Questions practised", value: "47" },
  { label: "Average feedback time", value: "12s" },
  { label: "Confidence boost", value: "+18%" },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_30%),linear-gradient(180deg,#fdf8ff_0%,#f7f0ff_44%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_24%),linear-gradient(180deg,#16081f_0%,#0b0611_48%,#050309_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[44rem] overflow-hidden">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite] dark:bg-fuchsia-500/20" />
        <div className="absolute right-[-5rem] top-16 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl motion-safe:animate-[drift_22s_ease-in-out_infinite] dark:bg-indigo-500/20" />
        <div className="absolute left-1/2 top-40 h-64 w-[38rem] -translate-x-1/2 rounded-full bg-purple-300/25 blur-3xl dark:bg-purple-700/15" />
      </div>

      <Navbar />

      <section className="px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/80 bg-white/75 px-4 py-2 text-sm font-medium text-purple-700 shadow-sm shadow-purple-500/10 backdrop-blur dark:border-purple-400/20 dark:bg-white/[0.05] dark:text-purple-200">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
              Built for students who want smarter revision
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">
              Sharpen every answer before exam day.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700 dark:text-slate-300">
              StarglazeRevision helps you practise real exam-style questions,
              get instant feedback, and turn every revision session into steady,
              visible progress.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className={primaryButtonClass} href="/login">
                Start Revising Free
              </Link>
              <a className={secondaryButtonClass} href="#how-it-works">
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/65 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                Real exam practice
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/65 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                Instant feedback
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/65 px-4 py-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                Faster improvement
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-purple-500/25 via-fuchsia-500/10 to-indigo-500/25 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-6 shadow-[0_30px_80px_-35px_rgba(91,33,182,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_32px_90px_-35px_rgba(0,0,0,0.75)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,181,253,0.35),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.24),transparent_38%)]" />

              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-200">
                      Live Revision Session
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                      Biology Mock Practice
                    </h2>
                  </div>
                  <div className="rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                    Feedback in 12s
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[1.5rem] border border-purple-100/80 bg-white/80 p-5 shadow-lg shadow-purple-950/5 dark:border-white/10 dark:bg-slate-950/45 dark:shadow-black/20">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-400/10 dark:text-purple-200">
                        Question
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        6 marks
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">
                      Explain two ways alveoli are adapted for efficient gas
                      exchange.
                    </p>

                    <div className="mt-5 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        Exam-style structure
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        Built to test explanation quality
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.5rem] border border-white/70 bg-white/88 p-5 shadow-lg shadow-purple-950/5 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-black/20">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                        Your answer
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
                        Alveoli have a very large surface area and a thin wall,
                        so oxygen can diffuse into the blood quickly.
                      </p>
                    </div>

                    <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/90 p-5 shadow-lg shadow-emerald-950/5 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:shadow-black/20">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-200">
                          Feedback
                        </p>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                          Clear next step
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-emerald-900 dark:text-emerald-50">
                        Strong start. Add the rich blood supply as your second
                        adaptation and link both points directly to faster
                        diffusion.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {sessionStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[1.25rem] border border-white/70 bg-white/75 px-4 py-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8"
        id="features"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-200">
              Features
            </p>
            <h2
              className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
              id="features-heading"
            >
              Everything students need to revise with more purpose.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              StarglazeRevision keeps revision active, specific, and useful by
              combining exam practice with feedback that actually helps you
              improve.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                description={feature.description}
                icon={feature.icon}
                title={feature.title}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="how-it-works-heading"
        className="scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8"
        id="how-it-works"
      >
        <div className="mx-auto max-w-6xl rounded-[2.5rem] border border-white/60 bg-white/65 p-8 shadow-[0_24px_80px_-40px_rgba(91,33,182,0.35)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_26px_90px_-40px_rgba(0,0,0,0.8)] sm:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-200">
              How it works
            </p>
            <h2
              className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
              id="how-it-works-heading"
            >
              A simple loop that turns revision into progress.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              No clutter. No vague revision sessions. Just clear practice,
              useful feedback, and better answers over time.
            </p>
          </div>

          <div className="relative mt-12 grid gap-6 lg:grid-cols-3">
            <div className="absolute left-24 right-24 top-8 hidden h-px bg-gradient-to-r from-purple-200 via-purple-400 to-indigo-300 lg:block dark:from-purple-500/20 dark:via-purple-300/50 dark:to-indigo-400/30" />

            {steps.map((step) => (
              <article
                key={step.number}
                className="relative rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-lg shadow-purple-950/5 dark:border-white/10 dark:bg-slate-950/45 dark:shadow-black/20"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-purple-500/25">
                    {step.number}
                  </span>
                  <h3 className="text-xl font-semibold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-5 text-base leading-7 text-slate-600 dark:text-slate-300">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="preview-heading"
        className="px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-200">
              Product preview
            </p>
            <h2
              className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
              id="preview-heading"
            >
              See the revision loop in one glance.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
              The goal is simple: answer better questions, get sharper
              feedback, and build exam confidence faster.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
            <article className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-purple-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-200">
                Question
              </p>
              <div className="mt-4 rounded-[1.5rem] border border-purple-100/80 bg-purple-50/70 p-5 dark:border-purple-400/15 dark:bg-purple-400/10">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                  Biology Paper 1
                </p>
                <p className="mt-3 text-base leading-7 text-slate-800 dark:text-white">
                  Explain why a large surface area and a rich blood supply both
                  help alveoli exchange gases efficiently.
                </p>
              </div>
            </article>

            <div className="hidden items-center justify-center lg:flex">
              <span className="rounded-full border border-purple-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm dark:border-purple-400/20 dark:bg-white/[0.04] dark:text-purple-200">
                Write
              </span>
            </div>

            <article className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-purple-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-200">
                Answer
              </p>
              <div className="mt-4 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-slate-950/45">
                <div className="h-28 rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                  Alveoli have a large surface area so more oxygen can diffuse
                  at once, and the rich blood supply keeps a concentration
                  gradient between the alveoli and the blood.
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Structured exam response</span>
                  <span>Ready for feedback</span>
                </div>
              </div>
            </article>

            <div className="hidden items-center justify-center lg:flex">
              <span className="rounded-full border border-purple-200/70 bg-white/70 px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm dark:border-purple-400/20 dark:bg-white/[0.04] dark:text-purple-200">
                Review
              </span>
            </div>

            <article className="rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-xl shadow-purple-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600 dark:text-purple-200">
                Feedback
              </p>
              <div className="mt-4 rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/85 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-100">
                    Strong explanation
                  </p>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                    Next step
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-emerald-900 dark:text-emerald-50">
                  Clear use of concentration gradient. To strengthen this
                  answer further, add how the thin alveolar wall shortens the
                  diffusion distance.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-purple-200/60 bg-[linear-gradient(135deg,rgba(168,85,247,0.16),rgba(255,255,255,0.88),rgba(99,102,241,0.14))] p-10 shadow-[0_30px_80px_-40px_rgba(91,33,182,0.45)] dark:border-purple-400/20 dark:bg-[linear-gradient(135deg,rgba(126,34,206,0.34),rgba(12,7,21,0.94),rgba(79,70,229,0.24))] dark:shadow-[0_30px_90px_-42px_rgba(0,0,0,0.85)] sm:p-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-700 dark:text-purple-200">
              Start stronger sessions
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Ready to make revision feel productive?
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-700 dark:text-slate-300">
              Start practising with exam-style questions and feedback that
              keeps you moving toward clearer, higher-mark answers.
            </p>
          </div>

          <div className="mt-8">
            <Link className={primaryButtonClass} href="/login">
              Start Revising Free
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/60 px-4 py-8 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-slate-900 dark:text-white">
            StarglazeRevision
          </p>
          <p>Built for smarter exam practice</p>
        </div>
      </footer>
    </main>
  );
}

function PracticeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7.75 4.75h8.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Zm2.5 4h5.5m-5.5 3h5.5m-5.5 3h3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6.75 7.75h10.5a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2h-5.53l-3.72 2.5v-2.5H6.75a2 2 0 0 1-2-2v-5.5a2 2 0 0 1 2-2Zm2.5 4h5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6.75 15.25 10 12l2.75 2.75L17.25 9.5M17.25 9.5h-3.5m3.5 0V13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m7.75 12.25 2.5 2.5 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
