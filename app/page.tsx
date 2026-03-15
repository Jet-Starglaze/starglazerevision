import Link from "next/link";
import FeatureCard from "@/components/feature-card";
import LandingPageIcons from "@/components/landing-page-icons";
import Navbar from "@/components/navbar";
import ProductPreview from "@/components/product-preview";

const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-sky-700 hover:to-blue-800";

const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

const benefits = [
  {
    title: "Practise instead of rereading",
    description:
      "Spend more time answering exam questions and less time guessing whether re-reading your notes is actually working.",
    icon: <PracticeIcon className="h-5 w-5" />,
  },
  {
    title: "See missing points quickly",
    description:
      "Find where you left marks on the table, and rewrite your answer until you get it right.",
    icon: <FeedbackIcon className="h-5 w-5" />,
  },
  {
    title: "Improve longer answers with structure",
    description:
      "Build essays with feedback that tells you immediately how to make the next one stronger.",
    icon: <EssayIcon className="h-5 w-5" />,
  },
];

const beforeRevision = [
  "Finish a revision session without answering any questions",
  "Avoid longer questions because marking them yourself is slow and annoying.",
  "Reread notes and hope it'll come back in the exam.",
];

const afterRevision = [
  "Answer exam questions from the start.",
  "Get feedback instantly. Fix your answers on the spot.",
  "Walk into the exam confident.",
];

export default function Home() {
  return (
    <div className="relative isolate overflow-x-clip bg-slate-50 dark:bg-slate-950">
      <LandingPageIcons />

      <div className="relative z-10">
        <Navbar />

        <main>
          <section className="px-4 pb-18 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">
              Faster. Better. Revision.
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">
              Turn knowledge into marks.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
              From a 3 mark answer to a full mark answer under pressure.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link className={primaryButtonClass} href="/login">
                Start Revising Free
              </Link>
              <a className={secondaryButtonClass} href="#how-it-works">
                See how it works
              </a>
            </div>

          
          </div>

          <div className="relative mx-auto mt-12 max-w-6xl">
            

            <ProductPreview />
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
                Clearer answers, clearer feedback, and more focused
                revision.
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Instead of guessing whether revision is working, you&apos;ll
                see what you did well and what still needs to improve.
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
              <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
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

              <article className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm dark:border-sky-900 dark:bg-sky-950">
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
          <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-200">
              Start revising
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Clearer feedback; less guesswork.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
              Practise exam questions. Improve answers faster. Go into
              the next exam confident.
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

        <footer className="border-t border-slate-200 px-4 py-8 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:px-6 lg:px-8">
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
