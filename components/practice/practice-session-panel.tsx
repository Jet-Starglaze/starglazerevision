"use client";

import DesktopSidebarToggle from "@/components/practice/desktop-sidebar-toggle";
import type {
  PracticeQuestionFilterMode,
  PracticeSessionLength,
} from "@/lib/mock-biology-practice";
import type { GenerateQuestionResponse } from "@/lib/mock-biology-practice-api";

type SessionSelectedSubtopic = {
  id: number;
  name: string;
  code: string;
  moduleLabel: string;
  moduleName: string;
  topicName: string;
};

type PracticeSessionPanelProps = {
  selectedSubtopics: SessionSelectedSubtopic[];
  questionFilterMode: PracticeQuestionFilterMode;
  sessionLength: PracticeSessionLength;
  progressLabel: string;
  progressMessage: string;
  generateButtonLabel: string;
  generationError: string | null;
  isGeneratingQuestion: boolean;
  isSessionComplete: boolean;
  canReset: boolean;
  currentQuestion: GenerateQuestionResponse | null;
  answerDraft: string;
  isDeemphasized?: boolean;
  onQuestionFilterModeChange: (
    questionFilterMode: PracticeQuestionFilterMode,
  ) => void;
  onSessionLengthChange: (sessionLength: PracticeSessionLength) => void;
  onGenerateQuestion: () => void;
  onResetSession: () => void;
  onClose?: () => void;
  onCollapse?: () => void;
  presentation?: "standard" | "sheet";
};

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-sky-600 dark:hover:bg-sky-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const questionFilterModeOptions: Array<{
  value: PracticeQuestionFilterMode;
  label: string;
  description: string;
}> = [
  {
    value: "mixed",
    label: "Mixed",
    description: "Use any saved question regardless of command word or marks.",
  },
  {
    value: "six-mark-only",
    label: "6-mark only",
    description: "Limit the generator to questions worth exactly 6 marks.",
  },
  {
    value: "long-answer",
    label: "Long-answer only",
    description: "Treat longer written questions as anything worth 3+ marks.",
  },
];

const sessionLengthOptions: PracticeSessionLength[] = [5, 10, 20];

export default function PracticeSessionPanel({
  selectedSubtopics,
  questionFilterMode,
  sessionLength,
  progressLabel,
  progressMessage,
  generateButtonLabel,
  generationError,
  isGeneratingQuestion,
  isSessionComplete,
  canReset,
  currentQuestion,
  answerDraft,
  isDeemphasized = false,
  onQuestionFilterModeChange,
  onSessionLengthChange,
  onGenerateQuestion,
  onResetSession,
  onClose,
  onCollapse,
  presentation = "standard",
}: PracticeSessionPanelProps) {
  const visibleTopics = selectedSubtopics.slice(0, 5);
  const remainingTopicCount = Math.max(
    selectedSubtopics.length - visibleTopics.length,
    0,
  );
  const canGenerate =
    selectedSubtopics.length > 0 &&
    !isGeneratingQuestion &&
    currentQuestion === null &&
    !isSessionComplete;
  const shouldShowDraftNotice =
    currentQuestion !== null && answerDraft.trim().length > 0;
  const shellClassName =
    presentation === "sheet"
      ? isDeemphasized
        ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.6)] dark:border-slate-800 dark:bg-slate-950/95"
        : "flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.6)] dark:border-slate-800 dark:bg-slate-950"
      : isDeemphasized
        ? "flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/80 xl:rounded-l-[26px] xl:border xl:border-r-0 xl:border-slate-200/80 xl:bg-slate-100/82 xl:shadow-[0_28px_60px_-46px_rgba(15,23,42,0.72)] xl:backdrop-blur-sm dark:xl:border-slate-800/80 dark:xl:bg-slate-950/90"
        : "flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 xl:rounded-l-[26px] xl:border xl:border-r-0 xl:border-slate-200/80 xl:bg-slate-100/88 xl:shadow-[0_28px_60px_-46px_rgba(15,23,42,0.72)] xl:backdrop-blur-sm dark:xl:border-slate-800/80 dark:xl:bg-slate-950/92";
  const sectionClassName =
    presentation === "sheet"
      ? isDeemphasized
        ? "rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/55"
        : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50"
      : isDeemphasized
        ? "rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-4 xl:border-slate-200/90 xl:bg-white/74 xl:shadow-[0_18px_40px_-34px_rgba(15,23,42,0.7)] dark:border-slate-800 dark:bg-slate-900/55 dark:xl:bg-slate-900/72"
        : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 xl:border-slate-200/90 xl:bg-white/78 xl:shadow-[0_18px_40px_-34px_rgba(15,23,42,0.7)] dark:border-slate-800 dark:bg-slate-900/50 dark:xl:bg-slate-900/75";

  return (
    <aside className="h-full min-h-0 bg-slate-50 dark:bg-slate-950">
      <div className={shellClassName}>
        <div className="shrink-0 border-b border-slate-200 px-4 pb-4 pt-5 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-200">
                Session
              </p>
              <h2 className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                Practice controls
              </h2>
              <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">
                Set the next question, then keep writing in the main workspace.
              </p>
            </div>

            {onClose ? (
              <button
                aria-label="Close session panel"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
                onClick={onClose}
                type="button"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            ) : onCollapse ? (
              <DesktopSidebarToggle
                ariaExpanded
                ariaLabel="Collapse session panel"
                className="h-9 w-9"
                direction="right"
                onClick={onCollapse}
              />
            ) : null}
          </div>
        </div>

        <div className="shrink-0 space-y-4 px-4 py-4">
          <section className={sectionClassName}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Session progress
              </p>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {progressLabel}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {progressMessage}
            </p>
            {isSessionComplete ? (
              <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Target reached. Keep practicing or reset for a fresh run.
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Question filter
            </h3>
            <div className="space-y-2">
              {questionFilterModeOptions.map((option) => {
                const isActive = option.value === questionFilterMode;

                return (
                  <button
                    aria-pressed={isActive}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-sky-400 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-500 dark:bg-sky-500/10 dark:text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-200"
                    }`}
                    key={option.value}
                    onClick={() => onQuestionFilterModeChange(option.value)}
                    type="button"
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Session length
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {sessionLengthOptions.map((option) => {
                const isActive = option === sessionLength;

                return (
                  <button
                    aria-pressed={isActive}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "border-sky-400 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-500 dark:bg-sky-500/10 dark:text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-200"
                    }`}
                    key={option}
                    onClick={() => onSessionLengthChange(option)}
                    type="button"
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col gap-3">
            <button
              className={primaryButtonClass}
              disabled={!canGenerate}
              onClick={onGenerateQuestion}
              type="button"
            >
              {isGeneratingQuestion ? "Generating..." : generateButtonLabel}
            </button>

            <button
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
              disabled={!canReset}
              onClick={onResetSession}
              type="button"
            >
              Reset session
            </button>
          </div>

          {generationError ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              {generationError}
            </div>
          ) : null}

          {shouldShowDraftNotice ? (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Generating another question will replace the current draft in the
              answer box.
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200 px-4 pb-4 pt-4 dark:border-slate-800">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Selected topics
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {selectedSubtopics.length} selected
              </span>
            </div>

            {selectedSubtopics.length > 0 ? (
              <div className={sectionClassName}>
                <div className="flex flex-wrap gap-2">
                  {visibleTopics.map((subtopic) => (
                    <span
                      className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      key={subtopic.id}
                      title={`${subtopic.moduleLabel} / ${subtopic.topicName} / ${subtopic.name}`}
                    >
                      {subtopic.name}
                    </span>
                  ))}
                  {remainingTopicCount > 0 ? (
                    <span className="inline-flex rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      +{remainingTopicCount} more
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  The generator only uses the subtopics currently selected in
                  the syllabus rail.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                Select one or more subtopics from the syllabus rail to build a
                practice session.
              </div>
            )}
          </section>
        </div>
      </div>
    </aside>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m7.75 7.75 8.5 8.5m0-8.5-8.5 8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

