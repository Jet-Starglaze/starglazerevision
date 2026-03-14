import Link from "next/link";
import FeatureCard from "@/components/feature-card";
import Navbar from "@/components/navbar";
import ProductPreview from "@/components/product-preview";
import SubjectPill from "@/components/subject-pill";

const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(37,99,235,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_52px_-20px_rgba(37,99,235,0.52)]";

const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-sky-200 bg-white/92 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:bg-slate-950/60 dark:text-white dark:hover:border-sky-400/40 dark:hover:text-sky-200";

const heroChips = [
  "A-Level Biology",
  "A-Level Psychology",
  "GCSE Science",
  "6-mark questions",
  "16-mark essays",
];

const subjectCards = [
  {
    title: "A-Level Biology",
    description:
      "Practise explanations, processes, and linked reasoning with feedback that spots missing scientific detail quickly.",
    examples: ["Cell biology", "Transport", "6-mark answers"],
  },
  {
    title: "A-Level Psychology",
    description:
      "Strengthen description, application, and evaluation with feedback that helps AO1, AO2, and AO3 answers feel sharper.",
    examples: ["Research methods", "Evaluation", "16-mark essays"],
  },
  {
    title: "GCSE Science",
    description:
      "Revise key topics with short-answer recall and longer explanations so you know what to improve before mocks and exams.",
    examples: ["Recall questions", "Explain questions", "Exam technique"],
  },
];

const questionTypeChips = [
  "4-mark questions",
  "6-mark explanations",
  "16-mark essays",
  "Recall practice",
  "Missing-point feedback",
];

const steps = [
  {
    number: "01",
    title: "Choose what you need to revise",
    description:
      "Pick the subject, topic, and question style that matches the area you need to improve next.",
  },
  {
    number: "02",
    title: "Answer an exam-style question",
    description:
      "Write the kind of answer you would need in the real exam, from short responses to longer marked questions.",
  },
  {
    number: "03",
    title: "Use feedback to improve",
    description:
      "See what was strong, what was missing, and what to add next so the next answer scores better.",
  },
];

const benefits = [
  {
    title: "Practise instead of rereading",
    description:
      "Spend more time answering exam questions and less time guessing whether passive revision is actually working.",
    icon: <PracticeIcon className="h-5 w-5" />,
  },
  {
    title: "See missing points quickly",
    description:
      "Find the terms, steps, and exam technique points that would have lifted the answer to a higher mark.",
    icon: <FeedbackIcon className="h-5 w-5" />,
  },
  {
    title: "Improve longer answers with structure",
    description:
      "Build clearer explanations and essays with feedback that tells you how to make the next response stronger.",
    icon: <EssayIcon className="h-5 w-5" />,
  },
];

const beforeRevision = [
  "Reread notes and hope the content will come back in the exam.",
  "Avoid longer questions because marking them yourself is slow and uncertain.",
  "Finish a revision session without knowing which marks you are still missing.",
];

const afterRevision = [
  "Answer exam questions from the start and revise actively.",
  "Get feedback straight away on what was strong and what to fix.",
  "Leave each session knowing what to practise next.",
];

export default function Home() {
  return (
    <div className="relative overflow-x-clip bg-[linear-gradient(180deg,#f7fbff_0%,#edf5ff_38%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#071220_0%,#081625_40%,#050c16_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] overflow-hidden">
        <div className="absolute left-1/2 top-6 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-500/12" />
        <div className="absolute left-[-5rem] top-32 h-72 w-72 rounded-full bg-blue-200/35 blur-3xl motion-safe:animate-[float_18s_ease-in-out_infinite] dark:bg-blue-500/10" />
        <div className="absolute right-[-6rem] top-24 h-80 w-80 rounded-full bg-cyan-200/35 blur-3xl motion-safe:animate-[drift_22s_ease-in-out_infinite] dark:bg-cyan-400/10" />
      </div>

      <Navbar />

      <main>
        <section className="px-4 pb-18 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">
              Revision practice for students
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">
              Practise exam questions and get instant feedback.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
              Improve short answers, 6-mark questions, and longer essays with
              clearer feedback on what to fix next.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link className={primaryButtonClass} href="/login">
                Start Revising Free
              </Link>
              <a className={secondaryButtonClass} href="#how-it-works">
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {heroChips.map((chip) => (
                <SubjectPill
                  key={chip}
                  className="bg-white/95 dark:bg-slate-950/65"
                  label={chip}
                />
              ))}
            </div>
          </div>

          <div className="relative mx-auto mt-12 max-w-6xl">
            <div className="hidden lg:block">
              <SubjectPill
                className="absolute left-2 top-16 bg-white/95 shadow-[0_20px_40px_-28px_rgba(14,116,144,0.35)] dark:bg-slate-950/75"
                label="Exam-style questions"
              />
              <SubjectPill
                className="absolute right-6 top-20 bg-white/95 shadow-[0_20px_40px_-28px_rgba(14,116,144,0.35)] dark:bg-slate-950/75"
                label="Marks and missing points"
              />
              <SubjectPill
                className="absolute bottom-12 left-8 bg-white/95 shadow-[0_20px_40px_-28px_rgba(14,116,144,0.35)] dark:bg-slate-950/75"
                label="Short and long answers"
              />
              <SubjectPill
                className="absolute bottom-10 right-10 bg-white/95 shadow-[0_20px_40px_-28px_rgba(14,116,144,0.35)] dark:bg-slate-950/75"
                label="Clear next steps"
              />
            </div>

            <ProductPreview />
          </div>
        </section>

        <section
          className="scroll-mt-28 px-4 py-18 sm:px-6 lg:px-8"
          id="subjects"
        >
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-sky-100/80 bg-white/88 p-8 shadow-[0_22px_70px_-44px_rgba(14,116,144,0.18)] dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_26px_84px_-46px_rgba(0,0,0,0.84)] sm:p-10">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">
                Subjects and question types
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                Revision content that feels like real exam practice.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                StarglazeRevision is designed around the way students actually
                revise: subjects, question types, marks, and the details that
                make an answer stronger.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {questionTypeChips.map((chip) => (
                <SubjectPill
                  key={chip}
                  className="bg-sky-50/80 dark:bg-sky-400/10"
                  label={chip}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {subjectCards.map((subject) => (
                <article
                  key={subject.title}
                  className="rounded-[1.5rem] border border-sky-100 bg-sky-50/75 p-5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
                    {subject.title}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
                    {subject.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {subject.examples.map((example) => (
                      <SubjectPill
                        key={example}
                        className="border-transparent bg-white/95 text-slate-700 shadow-none dark:bg-slate-950/65 dark:text-slate-200"
                        label={example}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-28 px-4 py-18 sm:px-6 lg:px-8"
          id="how-it-works"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">
                How it works
              </p>
              <h2
                className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white"
                id="how-it-works-heading"
              >
                A simple revision loop you can actually use.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Pick what to revise, answer the question, and use feedback to
                make the next response better.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-[1.75rem] border border-sky-100/80 bg-white/92 p-6 shadow-[0_20px_60px_-38px_rgba(14,116,144,0.2)] dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_24px_72px_-42px_rgba(0,0,0,0.82)]"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.55)]">
                    {step.number}
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-slate-950 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="scroll-mt-28 px-4 py-18 sm:px-6 lg:px-8"
          id="why-students-use-it"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">
                Why students use it
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                Built for clearer answers, clearer feedback, and more focused
                revision.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Instead of guessing whether revision is working, students can
                see what they did well and what still needs to improve.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <FeatureCard
                  key={benefit.title}
                  description={benefit.description}
                  icon={benefit.icon}
                  title={benefit.title}
                />
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white/92 p-6 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_24px_72px_-42px_rgba(0,0,0,0.82)]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                  Traditional revision
                </p>
                <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
                  {beforeRevision.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CrossIcon className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="rounded-[1.75rem] border border-sky-100/90 bg-sky-50/80 p-6 shadow-[0_20px_60px_-38px_rgba(14,116,144,0.2)] dark:border-sky-400/20 dark:bg-sky-400/10 dark:shadow-[0_24px_72px_-42px_rgba(0,0,0,0.82)]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
                  With StarglazeRevision
                </p>
                <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-800 dark:text-slate-100">
                  {afterRevision.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckIcon className="mt-1 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 pt-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[2.25rem] border border-sky-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.98))] p-10 text-center shadow-[0_26px_80px_-44px_rgba(14,116,144,0.25)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(8,18,32,0.96),rgba(7,18,31,0.98))] dark:shadow-[0_30px_84px_-44px_rgba(0,0,0,0.86)] sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-200">
              Start revising
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Start revising with clearer feedback and less guesswork.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
              Practise exam questions, improve your answers faster, and go into
              the next exam knowing what to revise next.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link className={primaryButtonClass} href="/login">
                Start Revising Free
              </Link>
              <Link className={secondaryButtonClass} href="/login">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-sky-100/80 px-4 py-8 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              StarglazeRevision
            </p>
            <p className="mt-1">Built for smarter exam practice.</p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              className="transition hover:text-sky-700 dark:hover:text-sky-200"
              href="/login"
            >
              Log in
            </Link>
            <Link
              className="transition hover:text-sky-700 dark:hover:text-sky-200"
              href="/login"
            >
              Start Revising
            </Link>
          </div>
        </div>
      </footer>
    </div>
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
        d="M6.75 5.75h10.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H6.75a1.5 1.5 0 0 1-1.5-1.5v-9.5a1.5 1.5 0 0 1 1.5-1.5Zm2.5 3.5h5.5m-5.5 3h5.5m-5.5 3h3.5"
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

function EssayIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7.75 6.75h8.5M7.75 10.75h8.5M7.75 14.75h5.5m-5.5 4.5h8.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2h-8.5a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z"
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

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m8.5 8.5 7 7m0-7-7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
