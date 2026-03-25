import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchPracticeStats,
  type PracticeStatsRecentAttemptRow,
  type PracticeStatsRequiredAreaRow,
  type PracticeStatsSkippedQuestionRow,
  type PracticeStatsSubtopicRow,
  type PracticeStatsSummary,
} from "@/lib/practice-stats";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Practice Statistics",
};

const PRACTICE_HREF = "/subjects/ocr-a-level-biology-a/practice";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500";

const disclosureClassName =
  "group rounded-3xl border border-slate-200/70 bg-white/75 px-5 py-4 shadow-sm shadow-slate-950/5 backdrop-blur-sm transition dark:border-slate-800/80 dark:bg-slate-950/70 dark:shadow-black/20 sm:px-6";

const tableContainerClassName =
  "overflow-x-auto rounded-3xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-950/5 dark:border-slate-800/80 dark:bg-slate-950/90 dark:shadow-black/20";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

const percentFormatter = new Intl.NumberFormat("en-GB", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function DashboardStatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const stats = await fetchPracticeStats(supabase, user.id);
  const weakestSubtopic = stats.focusNext.weakestSubtopic;
  const weakestRequiredArea = stats.focusNext.weakestRequiredArea;
  const mostRecentlyPractisedSubtopic =
    stats.focusNext.mostRecentlyPractisedSubtopic;
  const latestAttempt = stats.recentAttempts[0] ?? null;
  const weakAreaRows = stats.subtopicProgress.slice(0, 5);

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mx-auto w-full max-w-[1500px] space-y-8">
        <SummaryStrip
          summary={stats.summary}
          weakestSubtopic={weakestSubtopic}
        />

        <WeakestAreaCallout weakestSubtopic={weakestSubtopic} />

        <div className="grid gap-8 xl:grid-cols-[0.82fr_minmax(0,1.18fr)_0.95fr]">
          <LeftSupportColumn
            latestSubtopic={mostRecentlyPractisedSubtopic}
            summary={stats.summary}
          />
          <WeakAreasList rows={weakAreaRows} />
          <RightContextColumn
            latestAttempt={latestAttempt}
            weakestRequiredArea={weakestRequiredArea}
          />
        </div>

        <div className="space-y-3">
          <DisclosureSection
            description="Secondary metrics and focus-area detail."
            title="Detailed breakdown"
          >
            <DetailedBreakdown
              latestSubtopic={mostRecentlyPractisedSubtopic}
              rows={stats.requiredAreaProgress}
              summary={stats.summary}
              weakestRequiredArea={weakestRequiredArea}
            />
          </DisclosureSection>

          <DisclosureSection
            description="Every subtopic, sorted weakest first."
            title="Subtopic progress"
          >
            <SubtopicProgressTable rows={stats.subtopicProgress} />
          </DisclosureSection>

          <DisclosureSection
            description="Latest marked answers and scores."
            title="Recent attempts"
          >
            <RecentAttemptsTable rows={stats.recentAttempts} />
          </DisclosureSection>

          <DisclosureSection
            description="Questions you skipped most recently."
            title="Recently skipped"
          >
            <RecentSkippedQuestionsTable rows={stats.recentSkippedQuestions} />
          </DisclosureSection>
        </div>
      </div>
    </main>
  );
}

function SummaryStrip({
  summary,
  weakestSubtopic,
}: {
  summary: PracticeStatsSummary;
  weakestSubtopic: PracticeStatsSubtopicRow | null;
}) {
  return (
    <section className="border-b border-slate-200/80 pb-5 dark:border-slate-800/80">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            At a glance
          </p>

          <div className="grid gap-4 sm:grid-cols-4">
            <SummaryInlineItem
              label="Questions completed"
              value={String(summary.questionsCompleted)}
            />
            <SummaryInlineItem
              label="Questions skipped"
              value={String(summary.questionsSkipped)}
            />
            <SummaryInlineItem
              label="Average score"
              value={formatRatio(summary.averageScoreRatio)}
            />
            <SummaryInlineItem
              label="Weakest area"
              value={weakestSubtopic?.subtopicName ?? "No weak area yet"}
              supporting={
                weakestSubtopic
                  ? `${formatRatio(weakestSubtopic.averageScoreRatio)} average score`
                  : "Complete a few marked answers to surface your next focus."
              }
            />
          </div>
        </div>

        <Link
          className="inline-flex items-center gap-2 self-start rounded-full px-1 py-2 text-sm font-medium text-slate-600 transition hover:text-sky-700 dark:text-slate-300 dark:hover:text-sky-200"
          href="/dashboard"
          prefetch={false}
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}

function SummaryInlineItem({
  label,
  value,
  supporting,
}: {
  label: string;
  value: string;
  supporting?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="truncate text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
        {value}
      </p>
      {supporting ? (
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {supporting}
        </p>
      ) : null}
    </div>
  );
}

function WeakestAreaCallout({
  weakestSubtopic,
}: {
  weakestSubtopic: PracticeStatsSubtopicRow | null;
}) {
  const ctaLabel = weakestSubtopic
    ? `Continue training -> ${weakestSubtopic.subtopicName}`
    : "Practice this now";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/80 shadow-sm shadow-slate-950/5 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/75 dark:shadow-black/20">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_48%)] px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
              Focus next
            </p>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                {weakestSubtopic?.subtopicName ?? "Build a clearer picture of your weakest area"}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                {weakestSubtopic
                  ? `${formatRatio(weakestSubtopic.averageScoreRatio)} average score and ${weakestSubtopic.masteryBand ?? "early"} mastery. This is the clearest place to spend your next revision block.`
                  : "A little more marked practice will surface your weakest subtopic and give you a sharper recommendation here."}
              </p>
            </div>

            {weakestSubtopic ? (
              <div className="flex flex-wrap items-center gap-2">
                {weakestSubtopic.subtopicCode ? (
                  <span className="inline-flex rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300">
                    {weakestSubtopic.subtopicCode}
                  </span>
                ) : null}
                <MasteryBandPill masteryBand={weakestSubtopic.masteryBand} />
              </div>
            ) : null}
          </div>

          <div className="flex w-full max-w-md flex-col gap-3">
            <Link
              className={`${primaryButtonClass} justify-between rounded-2xl px-5 text-left`}
              href={PRACTICE_HREF}
              prefetch={false}
            >
              <span className="truncate">{ctaLabel}</span>
              <span aria-hidden="true">{"->"}</span>
            </Link>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Open the practice workspace and keep your next revision block
              focused on the weakest current area.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function LeftSupportColumn({
  summary,
  latestSubtopic,
}: {
  summary: PracticeStatsSummary;
  latestSubtopic: PracticeStatsSubtopicRow | null;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Supporting context
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          Keep the detail light
        </h2>
      </div>

      <div className="space-y-4 rounded-[1.75rem] border border-slate-200/70 bg-white/65 p-5 shadow-sm shadow-slate-950/5 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/60 dark:shadow-black/20">
        <CompactSupportStat
          label="Questions attempted"
          value={String(summary.questionsAttempted)}
        />
        <CompactSupportStat
          label="Questions skipped"
          value={String(summary.questionsSkipped)}
        />
        <CompactSupportStat
          label="Average attempts per question"
          value={formatDecimal(summary.averageAttemptsPerQuestion)}
        />
        <CompactSupportStat
          label="Attempts to completion"
          value={formatNullableDecimal(summary.averageAttemptsToCompletion)}
        />
      </div>

      <div className="space-y-2 rounded-[1.75rem] border border-slate-200/70 bg-white/55 p-5 dark:border-slate-800/80 dark:bg-slate-950/55">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Most recently practised
        </p>
        <p className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
          {latestSubtopic?.subtopicName ?? "No recent practice yet"}
        </p>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {latestSubtopic
            ? formatDateTime(latestSubtopic.lastPractisedAt)
            : "Your latest subtopic activity will appear here after your first marked answer."}
        </p>
      </div>
    </section>
  );
}

function CompactSupportStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-200/70 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800/70">
      <p className="text-sm text-slate-600 dark:text-slate-300">{label}</p>
      <p className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function WeakAreasList({ rows }: { rows: PracticeStatsSubtopicRow[] }) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-200">
          Train these next
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Your weakest subtopics
        </h2>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No weak areas yet. Complete a few marked answers and this list will start surfacing what to train next." />
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <Link
              className="group flex items-center justify-between gap-4 rounded-[1.6rem] border border-slate-200/70 bg-white/85 px-4 py-4 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md hover:shadow-sky-950/10 dark:border-slate-800/80 dark:bg-slate-950/78 dark:shadow-black/20 dark:hover:border-sky-500/60"
              href={PRACTICE_HREF}
              key={row.subtopicId}
              prefetch={false}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                    {row.subtopicName}
                  </p>
                  {row.subtopicCode ? (
                    <span className="rounded-full border border-slate-200/80 bg-white/75 px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400">
                      {row.subtopicCode}
                    </span>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span>{formatRatio(row.averageScoreRatio)} score</span>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                    /
                  </span>
                  <MasteryBandPill masteryBand={row.masteryBand} />
                  {index === 0 ? (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                      Start here
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 text-sm font-semibold text-slate-800 transition group-hover:border-sky-300 group-hover:text-sky-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100 dark:group-hover:border-sky-500 dark:group-hover:text-sky-200">
                  Practice
                  <span aria-hidden="true">{"->"}</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-800 dark:text-sky-200 dark:hover:text-sky-100"
        href={PRACTICE_HREF}
        prefetch={false}
      >
        Continue training
        {rows[0] ? ` -> ${rows[0].subtopicName}` : ""}
      </Link>
    </section>
  );
}

function RightContextColumn({
  latestAttempt,
  weakestRequiredArea,
}: {
  latestAttempt: PracticeStatsRecentAttemptRow | null;
  weakestRequiredArea: PracticeStatsRequiredAreaRow | null;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          Recent context
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          Stay oriented
        </h2>
      </div>

      <ContextCard
        description={
          latestAttempt
            ? `Attempt ${latestAttempt.attemptNumber} on ${formatDateTime(latestAttempt.createdAt)}`
            : "Your latest score and topic will appear here after the next marked answer."
        }
        eyebrow="Latest attempt"
        title={
          latestAttempt
            ? `${latestAttempt.score} / ${latestAttempt.maxScore}`
            : "No attempts yet"
        }
      >
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {latestAttempt?.subtopicName ?? "Start practice to populate this section"}
        </p>
      </ContextCard>

      <ContextCard
        description={
          weakestRequiredArea
            ? `${weakestRequiredArea.subtopicName} / ${formatRatio(
                weakestRequiredArea.masteryRatio,
              )} mastery`
            : "This updates as focus-area mastery data becomes available."
        }
        eyebrow="Weakest focus area"
        title={
          weakestRequiredArea?.requiredAreaLabel ?? "No focus-area data yet"
        }
      >
        {weakestRequiredArea ? (
          <MasteryBandPill masteryBand={weakestRequiredArea.masteryBand} />
        ) : null}
      </ContextCard>
    </section>
  );
}

function ContextCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="space-y-3 rounded-[1.75rem] border border-slate-200/70 bg-white/78 p-5 shadow-sm shadow-slate-950/5 dark:border-slate-800/80 dark:bg-slate-950/74 dark:shadow-black/20">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {eyebrow}
      </p>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
      {children ? <div>{children}</div> : null}
    </article>
  );
}

function DisclosureSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className={disclosureClassName}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 transition group-open:rotate-45 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">
          +
        </span>
      </summary>

      <div className="mt-5 border-t border-slate-200/70 pt-5 dark:border-slate-800/70">
        {children}
      </div>
    </details>
  );
}

function DetailedBreakdown({
  summary,
  rows,
  weakestRequiredArea,
  latestSubtopic,
}: {
  summary: PracticeStatsSummary;
  rows: PracticeStatsRequiredAreaRow[];
  weakestRequiredArea: PracticeStatsRequiredAreaRow | null;
  latestSubtopic: PracticeStatsSubtopicRow | null;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <LightMetricCard
          label="Questions attempted"
          value={String(summary.questionsAttempted)}
        />
        <LightMetricCard
          label="Questions completed"
          value={String(summary.questionsCompleted)}
        />
        <LightMetricCard
          label="Questions skipped"
          value={String(summary.questionsSkipped)}
        />
        <LightMetricCard
          label="Average attempts per question"
          value={formatDecimal(summary.averageAttemptsPerQuestion)}
        />
        <LightMetricCard
          label="Average attempts to completion"
          value={formatNullableDecimal(summary.averageAttemptsToCompletion)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ContextCard
          description={
            weakestRequiredArea
              ? `${weakestRequiredArea.subtopicName} / ${weakestRequiredArea.timesTested} tested`
              : "Mark answers with focus-area data to unlock this recommendation."
          }
          eyebrow="Weakest focus area overall"
          title={
            weakestRequiredArea?.requiredAreaLabel ?? "No focus-area data yet"
          }
        >
          {weakestRequiredArea ? (
            <div className="flex flex-wrap items-center gap-2">
              <MasteryBandPill masteryBand={weakestRequiredArea.masteryBand} />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {formatResultsSummary(weakestRequiredArea)}
              </span>
            </div>
          ) : null}
        </ContextCard>

        <ContextCard
          description={
            latestSubtopic
              ? formatDateTime(latestSubtopic.lastPractisedAt)
              : "Your most recent subtopic practice will appear here after the next marked answer."
          }
          eyebrow="Latest subtopic session"
          title={latestSubtopic?.subtopicName ?? "No recent session yet"}
        >
          {latestSubtopic ? (
            <div className="flex flex-wrap items-center gap-2">
              <MasteryBandPill masteryBand={latestSubtopic.masteryBand} />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {formatRatio(latestSubtopic.averageScoreRatio)} average score
              </span>
            </div>
          ) : null}
        </ContextCard>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No focus-area progress has been recorded yet. Mark answers with rubric-linked required areas to populate this section." />
      ) : (
        <RequiredAreaBreakdownTable rows={rows} />
      )}
    </div>
  );
}

function LightMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950/75">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
    </article>
  );
}

function SubtopicProgressTable({
  rows,
}: {
  rows: PracticeStatsSubtopicRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No subtopic progress has been recorded yet. Complete a few marked answers to populate this table." />
    );
  }

  return (
    <div className={tableContainerClassName}>
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50/80 dark:bg-slate-900/80">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <TableHead>Subtopic</TableHead>
            <TableHead>Questions seen</TableHead>
            <TableHead>Questions completed</TableHead>
            <TableHead>Average score</TableHead>
            <TableHead>Average attempts</TableHead>
            <TableHead>Mastery</TableHead>
            <TableHead>Last practised</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.subtopicId}>
              <TableCell>
                <SubtopicCell
                  subtopicCode={row.subtopicCode}
                  subtopicName={row.subtopicName}
                />
              </TableCell>
              <TableCell>{String(row.questionsSeen)}</TableCell>
              <TableCell>{String(row.questionsCompleted)}</TableCell>
              <TableCell>{formatRatio(row.averageScoreRatio)}</TableCell>
              <TableCell>
                {formatDecimal(row.averageAttemptsPerQuestion)}
              </TableCell>
              <TableCell>
                <MasteryBandPill masteryBand={row.masteryBand} />
              </TableCell>
              <TableCell>{formatDateTime(row.lastPractisedAt)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequiredAreaBreakdownTable({
  rows,
}: {
  rows: PracticeStatsRequiredAreaRow[];
}) {
  return (
    <div className={tableContainerClassName}>
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50/80 dark:bg-slate-900/80">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <TableHead>Subtopic</TableHead>
            <TableHead>Focus area</TableHead>
            <TableHead>Tested</TableHead>
            <TableHead>Results</TableHead>
            <TableHead>Mastery</TableHead>
            <TableHead>Last practised</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={`${row.subtopicId}-${row.requiredArea}`}>
              <TableCell>
                <SubtopicCell
                  subtopicCode={row.subtopicCode}
                  subtopicName={row.subtopicName}
                />
              </TableCell>
              <TableCell>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {row.requiredAreaLabel}
                </span>
              </TableCell>
              <TableCell>{String(row.timesTested)}</TableCell>
              <TableCell>{formatResultsSummary(row)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <span>{formatRatio(row.masteryRatio)}</span>
                  <MasteryBandPill masteryBand={row.masteryBand} />
                </div>
              </TableCell>
              <TableCell>{formatDateTime(row.lastPractisedAt)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentAttemptsTable({
  rows,
}: {
  rows: PracticeStatsRecentAttemptRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No answer attempts have been recorded yet. Submit an answer in the practice workspace to populate recent attempts." />
    );
  }

  return (
    <div className={tableContainerClassName}>
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50/80 dark:bg-slate-900/80">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <TableHead>Question text</TableHead>
            <TableHead>Subtopic</TableHead>
            <TableHead>Attempt number</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Date/time</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row) => (
            <tr
              key={`${row.generatedQuestionId}-${row.attemptNumber}-${row.createdAt ?? "unknown"}`}
            >
              <TableCell>
                <span className="block max-w-[28rem] truncate font-medium text-slate-900 dark:text-slate-100">
                  {row.questionText}
                </span>
              </TableCell>
              <TableCell>
                <SubtopicCell
                  subtopicCode={row.subtopicCode}
                  subtopicName={row.subtopicName}
                />
              </TableCell>
              <TableCell>{String(row.attemptNumber)}</TableCell>
              <TableCell>{`${row.score} / ${row.maxScore}`}</TableCell>
              <TableCell>{formatDateTime(row.createdAt)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentSkippedQuestionsTable({
  rows,
}: {
  rows: PracticeStatsSkippedQuestionRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState message="No skipped questions have been recorded yet. Use Skip question in the practice workspace to populate this section." />
    );
  }

  return (
    <div className={tableContainerClassName}>
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50/80 dark:bg-slate-900/80">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <TableHead>Question text</TableHead>
            <TableHead>Subtopic</TableHead>
            <TableHead>Attempts recorded</TableHead>
            <TableHead>Skipped at</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={`${row.generatedQuestionId}-${row.skippedAt ?? "unknown"}`}>
              <TableCell>
                <span className="block max-w-[28rem] truncate font-medium text-slate-900 dark:text-slate-100">
                  {row.questionText}
                </span>
              </TableCell>
              <TableCell>
                <SubtopicCell
                  subtopicCode={row.subtopicCode}
                  subtopicName={row.subtopicName}
                />
              </TableCell>
              <TableCell>{String(row.attemptsTotal)}</TableCell>
              <TableCell>{formatDateTime(row.skippedAt)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300/80 bg-white/65 px-5 py-5 text-sm leading-7 text-slate-600 dark:border-slate-700/80 dark:bg-slate-950/60 dark:text-slate-300">
      {message}
    </div>
  );
}

function SubtopicCell({
  subtopicCode,
  subtopicName,
}: {
  subtopicCode: string | null;
  subtopicName: string;
}) {
  return (
    <div className="min-w-[14rem]">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        {subtopicName}
      </p>
      {subtopicCode ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {subtopicCode}
        </p>
      ) : null}
    </div>
  );
}

function MasteryBandPill({
  masteryBand,
}: {
  masteryBand: PracticeStatsSubtopicRow["masteryBand"];
}) {
  const className =
    masteryBand === "strong"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
      : masteryBand === "developing"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        : masteryBand === "weak"
          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
          : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {masteryBand ?? "-"}
    </span>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}

function TableCell({ children }: { children: ReactNode }) {
  return (
    <td className="px-4 py-4 align-top text-slate-700 dark:text-slate-200">
      {children}
    </td>
  );
}

function formatRatio(value: number) {
  return percentFormatter.format(value);
}

function formatDecimal(value: number) {
  return decimalFormatter.format(value);
}

function formatNullableDecimal(value: number | null) {
  return value === null ? "-" : formatDecimal(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return dateTimeFormatter.format(new Date(value));
}

function formatResultsSummary(row: PracticeStatsRequiredAreaRow) {
  return `${row.timesPresent} present / ${row.timesPartial} partial / ${row.timesAbsent} absent`;
}
