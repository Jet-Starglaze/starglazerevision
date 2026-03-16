"use client";

import type {
  PracticeQuestion,
  PracticeQuestionType,
  PracticeSessionLength,
} from "@/lib/mock-biology-practice";

type SessionSelectedSubtopic = {
  id: string;
  name: string;
  code: string;
  moduleLabel: string;
  moduleName: string;
  topicName: string;
};

type PracticeSessionPanelProps = {
  selectedSubtopics: SessionSelectedSubtopic[];
  questionType: PracticeQuestionType;
  sessionLength: PracticeSessionLength;
  progressLabel: string;
  progressMessage: string;
  generateButtonLabel: string;
  showNoEligibleMessage: boolean;
  isSessionComplete: boolean;
  canReset: boolean;
  currentQuestion: PracticeQuestion | null;
  answerDraft: string;
  isDeemphasized?: boolean;
  onQuestionTypeChange: (questionType: PracticeQuestionType) => void;
  onSessionLengthChange: (sessionLength: PracticeSessionLength) => void;
  onGenerateQuestion: () => void;
  onResetSession: () => void;
  onClose?: () => void;
  onCollapse?: () => void;
};

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-sky-600 dark:hover:bg-sky-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const questionTypeOptions: Array<{
  value: PracticeQuestionType;
  label: string;
  description: string;
}> = [
  {
    value: "mixed",
    label: "Mixed",
    description: "Rotate through short and extended exam questions.",
  },
  {
    value: "six-mark",
    label: "6-mark only",
    description: "Stay on concise extended responses.",
  },
  {
    value: "long-answer",
    label: "Long-answer only",
    description: "Focus on deeper written explanations.",
  },
];

const sessionLengthOptions: PracticeSessionLength[] = [5, 10, 20];

export default function PracticeSessionPanel({
  selectedSubtopics,
  questionType,
  sessionLength,
  progressLabel,
  progressMessage,
  generateButtonLabel,
  showNoEligibleMessage,
  isSessionComplete,
  canReset,
  currentQuestion,
  answerDraft,
  isDeemphasized = false,
  onQuestionTypeChange,
  onSessionLengthChange,
  onGenerateQuestion,
  onResetSession,
  onClose,
  onCollapse,
}: PracticeSessionPanelProps) {
  const visibleTopics = selectedSubtopics.slice(0, 6);
  const remainingTopicCount = Math.max(
    selectedSubtopics.length - visibleTopics.length,
    0,
  );
  const canGenerate = selectedSubtopics.length > 0;
  const shouldShowDraftNotice =
    currentQuestion !== null && answerDraft.trim().length > 0;
  const shellClassName = isDeemphasized
    ? "flex h-full min-h-0 flex-col border-l border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/80"
    : "flex h-full min-h-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";
  const sectionClassName = isDeemphasized
    ? "rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/55"
    : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50";

  return (
    <aside className="h-full min-h-0 bg-white dark:bg-slate-950">
      <div className={shellClassName}>
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-200">
              Session
            </p>
            <h2 className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              Practice controls
            </h2>
            <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Set the next question, then tuck this panel away while you write.
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
            <button
              aria-label="Collapse session panel"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
              onClick={onCollapse}
              type="button"
            >
              <PanelCollapseIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
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
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  The generator only uses the subtopics currently selected in
                  the syllabus pane.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                Select one or more subtopics from the syllabus pane to build a
                practice session.
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Question type
            </h3>
            <div className="space-y-2">
              {questionTypeOptions.map((option) => {
                const isActive = option.value === questionType;

                return (
                  <button
                    aria-pressed={isActive}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-sky-400 bg-sky-50 text-slate-900 shadow-sm dark:border-sky-500 dark:bg-sky-500/10 dark:text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-200"
                    }`}
                    key={option.value}
                    onClick={() => onQuestionTypeChange(option.value)}
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

          {showNoEligibleMessage ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              No mock questions match this topic selection and question type
              yet. Try a different question type or choose different subtopics.
            </div>
          ) : null}

          {shouldShowDraftNotice ? (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Generating another question will replace the current draft in the
              answer box.
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex flex-col gap-3">
            <button
              className={primaryButtonClass}
              disabled={!canGenerate}
              onClick={onGenerateQuestion}
              type="button"
            >
              {generateButtonLabel}
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

function PanelCollapseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7.75 6.75h5.5m-5.5 5.25h5.5m-5.5 5.25h5.5m8-12.25v14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m17 12-2.75 2.75m2.75-2.75-2.75-2.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
