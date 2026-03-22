import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  fetchPracticeStats,
  type PracticeStatsFocusNext,
  type PracticeStatsRecentAttemptRow,
  type PracticeStatsRequiredAreaRow,
  type PracticeStatsSubtopicRow,
} from "@/lib/practice-stats";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Practice Statistics",
};

const sectionClassName =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8";

const panelClassName =
  "rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className={sectionClassName}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
                Practice statistics
              </p>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Verify progress and mastery tracking
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Review the current per-user practice data in one place so we
                  can confirm attempts, completion, subtopic progress, and
                  required-area mastery are updating as expected.
                </p>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Signed in as{" "}
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {user.email ?? "Unknown email"}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className={secondaryButtonClass}
                href="/dashboard"
                prefetch={false}
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Questions attempted"
              value={String(stats.summary.questionsAttempted)}
            />
            <SummaryCard
              label="Questions completed"
              value={String(stats.summary.questionsCompleted)}
            />
            <SummaryCard
              label="Average score ratio"
              value={formatRatio(stats.summary.averageScoreRatio)}
            />
            <SummaryCard
              label="Average attempts per question"
              value={formatDecimal(stats.summary.averageAttemptsPerQuestion)}
            />
            <SummaryCard
              label="Average attempts to completion"
              value={formatNullableDecimal(
                stats.summary.averageAttemptsToCompletion,
              )}
            />
          </div>
        </section>

        <StatsSection
          title="Subtopic progress"
          description="Check whether user-level subtopic rollups are populating and whether weaker areas surface clearly."
        >
          <SubtopicProgressTable rows={stats.subtopicProgress} />
        </StatsSection>

        <StatsSection
          title="Concept strengths and gaps"
          description="See which focus areas need more revision, which ones are becoming secure, and where to focus next."
        >
          <RequiredAreaInsights
            latestSubtopic={stats.focusNext.mostRecentlyPractisedSubtopic}
            rows={stats.requiredAreaProgress}
          />
        </StatsSection>

        <StatsSection
          title="Recent attempts"
          description="Inspect the latest answer attempts and confirm the generated question history is recording correctly."
        >
          <RecentAttemptsTable rows={stats.recentAttempts} />
        </StatsSection>

        <StatsSection
          title="Focus next"
          description="Use the current data to identify the weakest area, the weakest focus area, and the latest subtopic worked on."
        >
          <FocusNextGrid focusNext={stats.focusNext} />
        </StatsSection>
      </div>
    </main>
  );
}

function StatsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={sectionClassName}>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className={panelClassName}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
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
      <EmptyState
        message="No subtopic progress has been recorded yet. Complete a few marked answers to populate this table."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50/80 dark:bg-slate-900/80">
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <TableHead>Subtopic</TableHead>
            <TableHead>Questions seen</TableHead>
            <TableHead>Questions completed</TableHead>
            <TableHead>Average score ratio</TableHead>
            <TableHead>Average attempts per question</TableHead>
            <TableHead>Mastery band</TableHead>
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

function RequiredAreaInsights({
  rows,
  latestSubtopic,
}: {
  rows: PracticeStatsRequiredAreaRow[];
  latestSubtopic: PracticeStatsSubtopicRow | null;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        message="No focus-area progress has been recorded yet. Mark answers with rubric-linked required areas to populate this section."
      />
    );
  }

  const weakestOverall = rows[0] ?? null;
  const weakestInLatestSubtopic =
    latestSubtopic === null
      ? null
      : rows.find((row) => row.subtopicId === latestSubtopic.subtopicId) ?? null;
  const weakRows = sortFocusAreaRowsByBand(rows, "weak");
  const developingRows = sortFocusAreaRowsByBand(rows, "developing");
  const strongRows = sortFocusAreaRowsByBand(rows, "strong");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          What to revise next
        </h3>
        <div className="grid gap-4 xl:grid-cols-2">
          <FocusCard
            title="Weakest focus area overall"
            primary={weakestOverall?.requiredAreaLabel ?? "No focus-area data yet"}
            secondary={
              weakestOverall
                ? `${weakestOverall.subtopicName} / ${formatRatio(
                    weakestOverall.masteryRatio,
                  )} mastery ratio / ${weakestOverall.timesTested} tested`
                : "Mark more answers to surface your weakest focus area."
            }
            badge={
              weakestOverall ? (
                <MasteryBandPill masteryBand={weakestOverall.masteryBand} />
              ) : null
            }
          />
          <FocusCard
            title="Weakest focus area in your latest subtopic"
            primary={
              weakestInLatestSubtopic?.requiredAreaLabel ??
              "No recent subtopic focus area yet"
            }
            secondary={
              weakestInLatestSubtopic
                ? `${weakestInLatestSubtopic.subtopicName} / ${formatRatio(
                    weakestInLatestSubtopic.masteryRatio,
                  )} mastery ratio / ${weakestInLatestSubtopic.timesTested} tested`
                : latestSubtopic
                  ? "Keep working in this subtopic to build focus-area detail."
                  : "Complete a marked question to unlock this recommendation."
            }
            badge={
              weakestInLatestSubtopic ? (
                <MasteryBandPill
                  masteryBand={weakestInLatestSubtopic.masteryBand}
                />
              ) : null
            }
          />
        </div>
      </div>

      <FocusAreaGroup
        emptyMessage="No weak focus areas yet. Keep practising to confirm what still needs work."
        rows={weakRows}
        title="Focus areas to improve"
      />

      {developingRows.length > 0 ? (
        <FocusAreaGroup
          emptyMessage="No developing focus areas yet."
          rows={developingRows}
          title="Developing areas"
        />
      ) : null}

      <FocusAreaGroup
        emptyMessage="No strong focus areas yet. Stronger areas will appear here as your revision becomes more secure."
        rows={strongRows}
        title="Strong areas"
      />

      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            Detailed focus area breakdown
          </h3>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Use this smaller table to verify the underlying mastery data without
            letting raw counters dominate the page.
          </p>
        </div>
        <RequiredAreaBreakdownTable rows={rows} />
      </div>
    </div>
  );
}

function FocusAreaGroup({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: PracticeStatsRequiredAreaRow[];
  emptyMessage: string;
}) {
  const displayedRows = rows.slice(0, 6);

  if (displayedRows.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        {rows.length > displayedRows.length ? (
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            Showing {displayedRows.length} of {rows.length} focus areas. Use the
            detailed breakdown below to inspect the full list.
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {displayedRows.map((row) => (
          <article
            className={panelClassName}
            key={`${row.subtopicId}-${row.requiredArea}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h4 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                  {row.requiredAreaLabel}
                </h4>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {row.subtopicName}
                </p>
              </div>
              <MasteryBandPill masteryBand={row.masteryBand} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <span>
                Mastery:{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatRatio(row.masteryRatio)}
                </span>
              </span>
              <span>
                Tested:{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {String(row.timesTested)}
                </span>
              </span>
            </div>
            {row.lastPractisedAt ? (
              <p className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
                Last practised {formatDateTime(row.lastPractisedAt)}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function RequiredAreaBreakdownTable({
  rows,
}: {
  rows: PracticeStatsRequiredAreaRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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
      <EmptyState
        message="No answer attempts have been recorded yet. Submit an answer in the practice workspace to populate recent attempts."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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

function FocusNextGrid({ focusNext }: { focusNext: PracticeStatsFocusNext }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <FocusCard
        title="Weakest subtopic"
        primary={
          focusNext.weakestSubtopic?.subtopicName ?? "No subtopic data yet"
        }
        secondary={
          focusNext.weakestSubtopic
            ? `${formatRatio(focusNext.weakestSubtopic.averageScoreRatio)} average score ratio`
            : "Complete and mark answers to generate subtopic progress."
        }
        badge={
          focusNext.weakestSubtopic ? (
            <MasteryBandPill masteryBand={focusNext.weakestSubtopic.masteryBand} />
          ) : null
        }
      />
      <FocusCard
        title="Weakest focus area"
        primary={
          focusNext.weakestRequiredArea?.requiredAreaLabel ??
          "No focus-area data yet"
        }
        secondary={
          focusNext.weakestRequiredArea
            ? `${focusNext.weakestRequiredArea.subtopicName} / ${formatRatio(
                focusNext.weakestRequiredArea.masteryRatio,
              )} mastery ratio`
            : "Mark answers with required-area metadata to populate this recommendation."
        }
        badge={
          focusNext.weakestRequiredArea ? (
            <MasteryBandPill
              masteryBand={focusNext.weakestRequiredArea.masteryBand}
            />
          ) : null
        }
      />
      <FocusCard
        title="Most recently practised subtopic"
        primary={
          focusNext.mostRecentlyPractisedSubtopic?.subtopicName ??
          "No recent practice yet"
        }
        secondary={
          focusNext.mostRecentlyPractisedSubtopic
            ? formatDateTime(
                focusNext.mostRecentlyPractisedSubtopic.lastPractisedAt,
              )
            : "Work through a question to see your latest activity here."
        }
        badge={null}
      />
    </div>
  );
}

function FocusCard({
  title,
  primary,
  secondary,
  badge,
}: {
  title: string;
  primary: string;
  secondary: string;
  badge: ReactNode;
}) {
  return (
    <article className={`${panelClassName} flex h-full flex-col gap-4`}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
        {title}
      </p>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {primary}
        </h3>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
          {secondary}
        </p>
      </div>
      {badge ? <div>{badge}</div> : null}
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
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
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${className}`}
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

function sortFocusAreaRowsByBand(
  rows: PracticeStatsRequiredAreaRow[],
  masteryBand: PracticeStatsRequiredAreaRow["masteryBand"],
) {
  return rows
    .filter((row) => row.masteryBand === masteryBand)
    .sort((left, right) => {
      if (masteryBand === "strong" && left.masteryRatio !== right.masteryRatio) {
        return right.masteryRatio - left.masteryRatio;
      }

      if (masteryBand !== "strong" && left.masteryRatio !== right.masteryRatio) {
        return left.masteryRatio - right.masteryRatio;
      }

      if (left.timesTested !== right.timesTested) {
        return right.timesTested - left.timesTested;
      }

      const leftTimestamp = left.lastPractisedAt ?? "";
      const rightTimestamp = right.lastPractisedAt ?? "";

      if (leftTimestamp !== rightTimestamp) {
        return rightTimestamp.localeCompare(leftTimestamp);
      }

      const labelComparison = left.requiredAreaLabel.localeCompare(
        right.requiredAreaLabel,
      );

      if (labelComparison !== 0) {
        return labelComparison;
      }

      return left.subtopicName.localeCompare(right.subtopicName);
    });
}

function formatResultsSummary(row: PracticeStatsRequiredAreaRow) {
  return `${row.timesPresent} present / ${row.timesPartial} partial / ${row.timesAbsent} absent`;
}
