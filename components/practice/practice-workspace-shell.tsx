"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Breadcrumbs from "@/components/breadcrumbs";
import PracticeInputBar from "@/components/practice/practice-input-bar";
import PracticeSessionPanel from "@/components/practice/practice-session-panel";
import type {
  ApiErrorResponse,
  GenerateQuestionResponse,
  MarkAnswerResponse,
} from "@/lib/mock-biology-practice-api";
import {
  isPracticeQuestionCommandWord,
  PracticeQuestionFilterMode,
  PracticeSessionLength,
} from "@/lib/mock-biology-practice";

type WorkspaceSelectedSubtopic = {
  id: number;
  name: string;
  code: string;
  moduleLabel: string;
  moduleName: string;
  topicName: string;
};

type PracticeWorkspaceShellProps = {
  subjectName: string;
  subjectSlug: string;
  selectedSubtopicIds: number[];
  selectedSubtopics: WorkspaceSelectedSubtopic[];
  isSessionPanelOpen: boolean;
  onCloseSessionPanel: () => void;
  onOpenSessionPanel: () => void;
  onOpenSidebar: () => void;
};

type ThreadStage = "question" | "feedback" | "improving" | "complete";

type PracticeAttempt = {
  attemptNumber: number;
  answer: string;
  feedback: MarkAnswerResponse;
};

type SessionThread = {
  threadId: string;
  question: GenerateQuestionResponse;
  attempts: PracticeAttempt[];
  stage: ThreadStage;
  isCollapsed: boolean;
};

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-sky-600 dark:hover:bg-sky-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

export default function PracticeWorkspaceShell({
  subjectName,
  subjectSlug,
  selectedSubtopicIds,
  selectedSubtopics,
  isSessionPanelOpen,
  onCloseSessionPanel,
  onOpenSessionPanel,
  onOpenSidebar,
}: PracticeWorkspaceShellProps) {
  const [questionFilterMode, setQuestionFilterMode] =
    useState<PracticeQuestionFilterMode>("mixed");
  const [sessionLength, setSessionLength] = useState<PracticeSessionLength>(5);
  const [sessionThreads, setSessionThreads] = useState<SessionThread[]>([]);
  const [answerDraft, setAnswerDraft] = useState("");
  const [questionCursor, setQuestionCursor] = useState(0);
  const [completedQuestionCount, setCompletedQuestionCount] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isMarkingAnswer, setIsMarkingAnswer] = useState(false);
  const [answerReviewStartedAt, setAnswerReviewStartedAt] = useState<number | null>(
    null,
  );
  const [answerReviewElapsedMs, setAnswerReviewElapsedMs] = useState(0);
  const [isDesktopSessionPanelCollapsed, setIsDesktopSessionPanelCollapsed] =
    useState(false);
  const sessionRequestTokenRef = useRef(0);

  const activeThread = getActiveThread(sessionThreads);
  const currentQuestion = activeThread?.question ?? null;
  const hasSelectedTopics = selectedSubtopics.length > 0;
  const isSessionComplete =
    completedQuestionCount >= sessionLength &&
    sessionThreads.length > 0 &&
    activeThread === null;
  const isGeneratingNextThread =
    isGeneratingQuestion &&
    activeThread === null &&
    sessionThreads.length > 0 &&
    !isSessionComplete;
  const canResetSession =
    sessionThreads.length > 0 ||
    answerDraft.trim().length > 0 ||
    completedQuestionCount > 0 ||
    generationError !== null ||
    answerError !== null;
  const isSessionInProgress = sessionThreads.length > 0 || isGeneratingNextThread;
  const primaryActionLabel = getPrimaryActionLabel(
    sessionThreads.length,
    activeThread !== null,
  );
  const sessionProgressLabel = `${completedQuestionCount} / ${sessionLength} completed`;
  const sessionProgressMessage = isSessionComplete
    ? "Session target reached. Reset to begin a fresh run."
    : `${Math.max(sessionLength - completedQuestionCount, 0)} question${
        sessionLength - completedQuestionCount === 1 ? "" : "s"
      } left in this session.`;
  const desktopLayoutClass = isDesktopSessionPanelCollapsed
    ? "xl:grid-cols-[minmax(0,1fr)_3.75rem]"
    : "xl:grid-cols-[minmax(0,1fr)_320px]";
  const answerReviewTimerLabel =
    answerReviewStartedAt === null
      ? null
      : `AI review timer: ${formatElapsedSeconds(answerReviewElapsedMs)} elapsed`;

  useEffect(() => {
    if (answerReviewStartedAt === null) {
      setAnswerReviewElapsedMs(0);
      return;
    }

    const updateElapsedTime = () => {
      setAnswerReviewElapsedMs(Date.now() - answerReviewStartedAt);
    };

    updateElapsedTime();

    const intervalId = window.setInterval(updateElapsedTime, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [answerReviewStartedAt]);

  function resetSession() {
    sessionRequestTokenRef.current += 1;
    setSessionThreads([]);
    setAnswerDraft("");
    setQuestionCursor(0);
    setCompletedQuestionCount(0);
    setGenerationError(null);
    setAnswerError(null);
    setIsGeneratingQuestion(false);
    setIsMarkingAnswer(false);
    setAnswerReviewStartedAt(null);
    setAnswerReviewElapsedMs(0);
    setIsDesktopSessionPanelCollapsed(false);
  }

  function handleQuestionFilterModeChange(
    nextFilterMode: PracticeQuestionFilterMode,
  ) {
    setQuestionFilterMode(nextFilterMode);
    resetSession();
  }

  function handleSessionLengthChange(nextLength: PracticeSessionLength) {
    setSessionLength(nextLength);
  }

  function handleAnswerDraftChange(nextValue: string) {
    setAnswerDraft(nextValue);

    if (answerError) {
      setAnswerError(null);
    }
  }

  async function fetchGeneratedQuestion(requestToken: number) {
    const response = await fetch("/api/generate-question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subjectId: subjectSlug,
        selectedSubtopicIds,
        questionFilterMode,
        sessionLength,
        questionCursor,
      }),
    });
    const body = await readResponseBody(response);

    if (requestToken !== sessionRequestTokenRef.current) {
      return null;
    }

    if (!response.ok) {
      setGenerationError(
        getApiErrorMessage(body, "Could not generate a question right now."),
      );
      return null;
    }

    if (!isGenerateQuestionResponse(body)) {
      setGenerationError("Could not generate a question right now.");
      return null;
    }

    return body;
  }

  function appendGeneratedThread(question: GenerateQuestionResponse) {
    setSessionThreads((current) => [
      ...current,
      createSessionThread(question, current.length + 1),
    ]);
    setQuestionCursor((current) => current + 1);
    setAnswerDraft("");
    setGenerationError(null);
    setAnswerError(null);
    setIsDesktopSessionPanelCollapsed(true);
  }

  async function handleGenerateQuestion() {
    if (
      selectedSubtopicIds.length === 0 ||
      activeThread !== null ||
      isSessionComplete ||
      isGeneratingQuestion
    ) {
      if (selectedSubtopicIds.length === 0) {
        setGenerationError(
          "Select at least one subtopic before generating a question.",
        );
      }

      return;
    }

    const requestToken = sessionRequestTokenRef.current;

    setGenerationError(null);
    setAnswerError(null);
    setIsGeneratingQuestion(true);

    try {
      const nextQuestion = await fetchGeneratedQuestion(requestToken);

      if (!nextQuestion || requestToken !== sessionRequestTokenRef.current) {
        return;
      }

      appendGeneratedThread(nextQuestion);
    } catch {
      if (requestToken === sessionRequestTokenRef.current) {
        setGenerationError("Could not generate a question right now.");
      }
    } finally {
      if (requestToken === sessionRequestTokenRef.current) {
        setIsGeneratingQuestion(false);
      }
    }
  }

  async function handleSubmitAnswer() {
    if (!activeThread || isMarkingAnswer) {
      return;
    }

    const trimmedAnswer = answerDraft.trim();

    if (!trimmedAnswer) {
      setAnswerError("Answer text is required.");
      return;
    }

    const nextAttemptNumber = getNextAttemptNumber(activeThread);
    const requestToken = sessionRequestTokenRef.current;

    setAnswerError(null);
    setGenerationError(null);
    setIsMarkingAnswer(true);
    setAnswerReviewStartedAt(Date.now());

    try {
      const response = await fetch("/api/mark-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generatedQuestionId: Number(activeThread.question.questionId),
          answerText: trimmedAnswer,
          attemptNumber: nextAttemptNumber,
        }),
      });
      const body = await readResponseBody(response);

      if (requestToken !== sessionRequestTokenRef.current) {
        return;
      }

      setAnswerReviewStartedAt(null);

      if (!response.ok) {
        setAnswerError(
          getApiErrorMessage(body, "Could not review this answer right now."),
        );
        return;
      }

      if (!isMarkAnswerResponse(body)) {
        setAnswerError("Could not review this answer right now.");
        return;
      }

      const nextAttempt: PracticeAttempt = {
        attemptNumber: nextAttemptNumber,
        answer: trimmedAnswer,
        feedback: body,
      };

      const completed = hasReachedCompletionThreshold(body);

      setSessionThreads((current) =>
        updateActiveThread(current, (thread) => ({
          ...thread,
          attempts: [...thread.attempts, nextAttempt],
          stage: completed ? "complete" : "feedback",
          isCollapsed: completed ? false : thread.isCollapsed,
        })),
      );

      if (!completed) {
        setAnswerDraft(trimmedAnswer);
        return;
      }

      setAnswerDraft("");

      const nextCompletedQuestionCount = completedQuestionCount + 1;
      setCompletedQuestionCount(nextCompletedQuestionCount);

      if (nextCompletedQuestionCount >= sessionLength) {
        return;
      }

      setIsGeneratingQuestion(true);

      try {
        const nextQuestion = await fetchGeneratedQuestion(requestToken);

        if (!nextQuestion || requestToken !== sessionRequestTokenRef.current) {
          return;
        }

        appendGeneratedThread(nextQuestion);
      } catch {
        if (requestToken === sessionRequestTokenRef.current) {
          setGenerationError("Could not generate a question right now.");
        }
      } finally {
        if (requestToken === sessionRequestTokenRef.current) {
          setIsGeneratingQuestion(false);
        }
      }
    } catch {
      if (requestToken === sessionRequestTokenRef.current) {
        setAnswerReviewStartedAt(null);
        setAnswerError("Could not review this answer right now.");
      }
    } finally {
      if (requestToken === sessionRequestTokenRef.current) {
        setIsMarkingAnswer(false);
        setAnswerReviewStartedAt(null);
      }
    }
  }

  function handleImproveAnswer() {
    if (!activeThread || activeThread.attempts.length === 0) {
      return;
    }

    setAnswerError(null);
    setSessionThreads((current) =>
      updateActiveThread(current, (thread) => ({
        ...thread,
        stage: "improving",
      })),
    );
    setAnswerDraft(getLatestAttempt(activeThread)?.answer ?? "");
  }

  function toggleCompletedThread(threadId: string) {
    setSessionThreads((current) =>
      current.map((thread) =>
        thread.threadId === threadId && thread.stage === "complete"
          ? { ...thread, isCollapsed: !thread.isCollapsed }
          : thread,
      ),
    );
  }

  return (
    <section className="relative flex min-h-full min-w-0 bg-slate-50 dark:bg-slate-950">
      <div className={`grid min-h-full min-w-0 flex-1 ${desktopLayoutClass}`}>
        <div className="flex min-h-0 min-w-0 flex-col bg-slate-50 dark:bg-slate-950">
          <header className="border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-5 xl:px-6">
            <div className="mx-auto flex w-full max-w-[1000px] items-start justify-between gap-3">
              <div className="min-w-0">
                <Breadcrumbs
                  items={[
                    { label: "Subjects", href: "/subjects", prefetch: true },
                    {
                      label: subjectName,
                      href: `/subjects/${subjectSlug}`,
                      prefetch: true,
                    },
                    { label: "Practice questions" },
                  ]}
                />
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">
                  Practice questions
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Move through a full Biology session one thread at a time and
                  keep each completed question visible as you progress.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 xl:hidden">
                <button
                  className={secondaryButtonClass}
                  onClick={onOpenSidebar}
                  type="button"
                >
                  Syllabus
                </button>
                <button
                  className={secondaryButtonClass}
                  onClick={onOpenSessionPanel}
                  type="button"
                >
                  Controls
                </button>
              </div>
            </div>

            <div className="mx-auto mt-4 flex w-full max-w-[1000px] flex-wrap gap-2">
              <InlineStatusPill>
                {hasSelectedTopics
                  ? `${selectedSubtopics.length} subtopic${
                      selectedSubtopics.length === 1 ? "" : "s"
                    } selected`
                  : `No topics selected in ${subjectName}`}
              </InlineStatusPill>
              <InlineStatusPill>{sessionProgressLabel}</InlineStatusPill>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[1000px] flex-col px-4 py-4 sm:px-5 xl:px-6">
              {sessionThreads.length === 0 ? (
                <PracticeWorkspaceReadyState
                  hasSelectedTopics={hasSelectedTopics}
                  selectedTopicCount={selectedSubtopics.length}
                />
              ) : (
                <div className="space-y-6 pb-4 sm:space-y-7 sm:pb-6">
                  {sessionThreads.map((thread, index) =>
                    thread.stage === "complete" ? (
                      <CompletedPracticeThread
                        key={thread.threadId}
                        onToggleCollapse={() => toggleCompletedThread(thread.threadId)}
                        thread={thread}
                        threadNumber={index + 1}
                      />
                    ) : (
                      <ActivePracticeThread
                        answerDraft={answerDraft}
                        answerError={answerError}
                        answerReviewTimerLabel={answerReviewTimerLabel}
                        isMarkingAnswer={isMarkingAnswer}
                        key={thread.threadId}
                        onAnswerDraftChange={handleAnswerDraftChange}
                        onImproveAnswer={
                          thread.stage === "feedback" &&
                          thread.attempts.length > 0
                            ? handleImproveAnswer
                            : null
                        }
                        onSubmitAnswer={handleSubmitAnswer}
                        thread={thread}
                        threadNumber={index + 1}
                      />
                    ),
                  )}

                  {isGeneratingNextThread ? (
                    <ThreadLoadingState
                      nextThreadNumber={sessionThreads.length + 1}
                    />
                  ) : null}

                  {generationError && activeThread === null && !isSessionComplete ? (
                    <ThreadGenerationError
                      message={generationError}
                      onRetry={handleGenerateQuestion}
                    />
                  ) : null}

                  {isSessionComplete ? (
                    <SessionCompleteSummary
                      completedQuestionCount={completedQuestionCount}
                      onResetSession={resetSession}
                      sessionLength={sessionLength}
                    />
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="hidden xl:block">
          {isDesktopSessionPanelCollapsed ? (
            <DesktopSessionRail
              onExpand={() => setIsDesktopSessionPanelCollapsed(false)}
            />
          ) : (
            <PracticeSessionPanel
              answerDraft={answerDraft}
              canReset={canResetSession}
              currentQuestion={currentQuestion}
              generateButtonLabel={primaryActionLabel}
              generationError={generationError}
              isDeemphasized={isSessionInProgress}
              isGeneratingQuestion={isGeneratingQuestion}
              isSessionComplete={isSessionComplete}
              onCollapse={() => setIsDesktopSessionPanelCollapsed(true)}
              onGenerateQuestion={handleGenerateQuestion}
              onQuestionFilterModeChange={handleQuestionFilterModeChange}
              onResetSession={resetSession}
              onSessionLengthChange={handleSessionLengthChange}
              progressLabel={sessionProgressLabel}
              progressMessage={sessionProgressMessage}
              questionFilterMode={questionFilterMode}
              selectedSubtopics={selectedSubtopics}
              sessionLength={sessionLength}
            />
          )}
        </div>
      </div>

      <MobileSessionDrawer
        isOpen={isSessionPanelOpen}
        onClose={onCloseSessionPanel}
      >
        <PracticeSessionPanel
          answerDraft={answerDraft}
          canReset={canResetSession}
          currentQuestion={currentQuestion}
          generateButtonLabel={primaryActionLabel}
          generationError={generationError}
          isDeemphasized={isSessionInProgress}
          isGeneratingQuestion={isGeneratingQuestion}
          isSessionComplete={isSessionComplete}
          onClose={onCloseSessionPanel}
          onGenerateQuestion={handleGenerateQuestion}
          onQuestionFilterModeChange={handleQuestionFilterModeChange}
          onResetSession={resetSession}
          onSessionLengthChange={handleSessionLengthChange}
          progressLabel={sessionProgressLabel}
          progressMessage={sessionProgressMessage}
          questionFilterMode={questionFilterMode}
          selectedSubtopics={selectedSubtopics}
          sessionLength={sessionLength}
        />
      </MobileSessionDrawer>
    </section>
  );
}

function InlineStatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      {children}
    </span>
  );
}

type PracticeWorkspaceReadyStateProps = {
  hasSelectedTopics: boolean;
  selectedTopicCount: number;
};

function PracticeWorkspaceReadyState({
  hasSelectedTopics,
  selectedTopicCount,
}: PracticeWorkspaceReadyStateProps) {
  return (
    <section className="flex min-h-[360px] flex-1 items-center">
      <div className="w-full rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
          Ready
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Select topics and generate a question to start the session feed.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {hasSelectedTopics
            ? `${selectedTopicCount} subtopic${
                selectedTopicCount === 1 ? "" : "s"
              } selected. Use the controls pane to generate the first Biology question.`
            : "Use the syllabus pane to choose modules, topics, or subtopics first."}
        </p>
      </div>
    </section>
  );
}

type ActivePracticeThreadProps = {
  thread: SessionThread;
  threadNumber: number;
  answerDraft: string;
  answerError: string | null;
  answerReviewTimerLabel: string | null;
  isMarkingAnswer: boolean;
  onAnswerDraftChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onImproveAnswer: (() => void) | null;
};

function ActivePracticeThread({
  thread,
  threadNumber,
  answerDraft,
  answerError,
  answerReviewTimerLabel,
  isMarkingAnswer,
  onAnswerDraftChange,
  onSubmitAnswer,
  onImproveAnswer,
}: ActivePracticeThreadProps) {
  const isImproving = thread.stage === "improving";
  const shouldShowComposer =
    thread.stage === "question" || thread.stage === "improving";
  const nextAttemptNumber = getNextAttemptNumber(thread);
  const submitLabel = isMarkingAnswer
    ? "Reviewing answer..."
    : thread.attempts.length > 0
      ? `Submit attempt ${nextAttemptNumber}`
      : "Submit answer";

  return (
    <article className="space-y-6 rounded-[30px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:py-5">
      <QuestionThreadHeader
        isCondensed={thread.attempts.length > 0 || isImproving}
        question={thread.question}
        threadNumber={threadNumber}
      />

      {thread.attempts.length > 0 ? (
        <div className="space-y-5">
          {thread.attempts.map((attempt) => (
            <ThreadTurn attempt={attempt} key={attempt.attemptNumber} />
          ))}
        </div>
      ) : (
        <ThreadStartState />
      )}

      {onImproveAnswer ? (
        <ThreadActionBar
          action={
            <button
              className={`${primaryButtonClass} shrink-0`}
              onClick={onImproveAnswer}
              type="button"
            >
              Improve answer
            </button>
          }
          message="Review the feedback, then write a stronger next attempt in the composer below."
        />
      ) : null}

      {isImproving ? (
        <ThreadActionBar
          message={`Drafting attempt ${nextAttemptNumber}. Your revised answer will appear here as the next turn once you submit it.`}
        />
      ) : null}

      {shouldShowComposer ? (
        <div className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-slate-800/80">
          {answerError ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              {answerError}
            </div>
          ) : null}

          <PracticeInputBar
            footerNote={answerReviewTimerLabel}
            onSubmit={onSubmitAnswer}
            onValueChange={onAnswerDraftChange}
            readOnly={isMarkingAnswer}
            submitDisabled={isMarkingAnswer || answerDraft.trim().length === 0}
            submitLabel={submitLabel}
            value={answerDraft}
          />
        </div>
      ) : null}
    </article>
  );
}

type CompletedPracticeThreadProps = {
  thread: SessionThread;
  threadNumber: number;
  onToggleCollapse: () => void;
};

function CompletedPracticeThread({
  thread,
  threadNumber,
  onToggleCollapse,
}: CompletedPracticeThreadProps) {
  const firstAttempt = thread.attempts[0] ?? null;
  const finalAttempt = thread.attempts[thread.attempts.length - 1] ?? null;
  const improvementLabel =
    firstAttempt && finalAttempt
      ? getImprovementLabel(firstAttempt, finalAttempt)
      : "Improvement: not available";

  return (
    <article className="rounded-[24px] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/65 sm:px-5">
      <button
        aria-expanded={!thread.isCollapsed}
        className="flex w-full flex-col gap-4 text-left"
        onClick={onToggleCollapse}
        type="button"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                Question {threadNumber}
              </span>
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                Completed
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                {getCommandWordLabel(thread.question.questionType)}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {thread.question.topicLabel} / {thread.question.subtopicLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {thread.question.marks} marks
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {thread.isCollapsed ? "Show history" : "Hide history"}
              <ThreadDisclosureIcon
                className={`h-4 w-4 transition-transform ${
                  thread.isCollapsed ? "" : "rotate-180"
                }`}
              />
            </span>
          </div>
        </div>
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-4 text-sm leading-6 text-slate-600 dark:border-slate-800/80 dark:text-slate-300">
        {finalAttempt ? (
          <span>
            Final score:{" "}
            <span className="font-semibold text-slate-950 dark:text-white">
              {finalAttempt.feedback.score}/{finalAttempt.feedback.maxScore}
            </span>
            {finalAttempt.feedback.level !== null
              ? ` · Level ${finalAttempt.feedback.level}`
              : ""}
          </span>
        ) : null}
        <span>Attempts: {thread.attempts.length}</span>
        <span>{improvementLabel}</span>
      </div>

      {!thread.isCollapsed ? (
        <div className="mt-5 space-y-5 border-t border-slate-200/80 pt-5 dark:border-slate-800/80">
          <QuestionThreadHeader
            isCondensed
            question={thread.question}
            threadNumber={threadNumber}
          />

          <div className="space-y-5">
            {thread.attempts.map((attempt) => (
              <ThreadTurn attempt={attempt} key={attempt.attemptNumber} />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

type QuestionThreadHeaderProps = {
  question: GenerateQuestionResponse;
  threadNumber: number;
  isCondensed: boolean;
};

function QuestionThreadHeader({
  question,
  threadNumber,
  isCondensed,
}: QuestionThreadHeaderProps) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white/92 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/92 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-sky-200">
              Question {threadNumber}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {getCommandWordLabel(question.questionType)}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {question.topicLabel} / {question.subtopicLabel}
            </span>
          </div>

          <p
            className={`max-w-4xl font-semibold tracking-tight text-slate-950 dark:text-white ${
              isCondensed
                ? "text-lg leading-8 sm:text-xl sm:leading-9"
                : "text-2xl leading-10 sm:text-[2rem] sm:leading-[1.45]"
            }`}
          >
            {question.questionText}
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {question.marks} marks
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">
          Answer focus:
        </span>{" "}
        {question.answerFocus}
      </p>
    </section>
  );
}

function ThreadStartState() {
  return (
    <section className="flex justify-center py-3">
      <div className="max-w-xl text-center text-sm leading-7 text-slate-500 dark:text-slate-400">
        Your first answer will appear here as the opening turn in this question
        thread.
      </div>
    </section>
  );
}

type ThreadTurnProps = {
  attempt: PracticeAttempt;
};

type RubricAssessmentItem = MarkAnswerResponse["rubricAssessment"][number];

function ThreadTurn({ attempt }: ThreadTurnProps) {
  const correctItems = attempt.feedback.rubricAssessment.filter(
    (item) => item.status === "present",
  );
  const missingItems = attempt.feedback.rubricAssessment.filter(
    (item) => item.status === "absent",
  );
  const partialItems = attempt.feedback.rubricAssessment.filter(
    (item) => item.status === "partial",
  );

  return (
    <div className="space-y-4">
      <ThreadBlock
        align="right"
        caption={`Your answer - Attempt ${attempt.attemptNumber}`}
        tone="answer"
      >
        <p className="whitespace-pre-wrap text-sm leading-7 text-inherit">
          {attempt.answer}
        </p>
      </ThreadBlock>

      <ThreadBlock
        align="left"
        caption={`AI review - Attempt ${attempt.attemptNumber}`}
        headerTrailing={
          <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {attempt.feedback.score}/{attempt.feedback.maxScore}
            {attempt.feedback.level !== null
              ? ` · Level ${attempt.feedback.level}`
              : ""}
          </span>
        }
        tone="feedback"
      >
        <div className="space-y-5">
          <ReviewScoreSection feedback={attempt.feedback} />
          <RubricAssessmentSection
            emptyMessage="No mark points matched."
            items={correctItems}
            status="present"
            title="Correct"
          />
          <RubricAssessmentSection
            emptyMessage="No missing rubric points."
            items={missingItems}
            status="absent"
            title="Missing"
          />
          {partialItems.length > 0 ? (
            <RubricAssessmentSection
              items={partialItems}
              showReason
              status="partial"
              title="Partial"
            />
          ) : null}
          <NextDraftTargetSection nextStep={attempt.feedback.feedback.nextStep} />
        </div>
      </ThreadBlock>
    </div>
  );
}

type ReviewScoreSectionProps = {
  feedback: MarkAnswerResponse;
};

function ReviewScoreSection({ feedback }: ReviewScoreSectionProps) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Score
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {feedback.score}/{feedback.maxScore}
        </p>
        {feedback.level !== null ? (
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            Level {feedback.level}
          </span>
        ) : null}
      </div>
    </section>
  );
}

type RubricAssessmentSectionProps = {
  title: string;
  items: RubricAssessmentItem[];
  status: RubricAssessmentItem["status"];
  emptyMessage?: string;
  showReason?: boolean;
};

function RubricAssessmentSection({
  title,
  items,
  status,
  emptyMessage,
  showReason = false,
}: RubricAssessmentSectionProps) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-slate-300 bg-white/75 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          {emptyMessage}
        </p>
      ) : status === "absent" ? (
        <CompactMissingList items={items} />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <RubricAssessmentRow
              item={item}
              key={`${item.pointText}-${index}`}
              showReason={showReason}
              status={status}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CompactMissingList({ items }: { items: RubricAssessmentItem[] }) {
  return (
    <ul className="overflow-hidden rounded-[20px] border border-slate-200 bg-white/75 dark:border-slate-800 dark:bg-slate-900/70">
      {items.map((item, index) => (
        <li
          className={`px-4 py-3 text-sm leading-6 text-slate-700 dark:text-slate-300 ${
            index === 0 ? "" : "border-t border-slate-200/80 dark:border-slate-800/80"
          }`}
          key={`${item.pointText}-${index}`}
        >
          {item.pointText}
        </li>
      ))}
    </ul>
  );
}

type RubricAssessmentRowProps = {
  item: RubricAssessmentItem;
  status: RubricAssessmentItem["status"];
  showReason: boolean;
};

function RubricAssessmentRow({
  item,
  status,
  showReason,
}: RubricAssessmentRowProps) {
  const surfaceClass =
    status === "present"
      ? "border-emerald-200 bg-emerald-50/55 dark:border-emerald-500/30 dark:bg-emerald-500/10"
      : "border-amber-200 bg-amber-50/55 dark:border-amber-500/30 dark:bg-amber-500/10";

  return (
    <li className={`rounded-[18px] border px-3.5 py-3 ${surfaceClass}`}>
      <div className="flex items-start gap-3">
        <ReviewStatusMarker status={status} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">
            {item.pointText}
          </p>
          {status !== "absent" ? (
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                Evidence:
              </span>{" "}
              {item.evidence}
            </p>
          ) : null}
          {showReason ? (
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                Reason:
              </span>{" "}
              {item.reason}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ReviewStatusMarker({
  status,
}: {
  status: RubricAssessmentItem["status"];
}) {
  const markerClass =
    status === "present"
      ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200"
      : status === "partial"
        ? "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-200"
        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${markerClass}`}
    >
      {status === "present" ? (
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 12.5 9.5 17 19 7.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      ) : (
        <span className="text-xs font-semibold">
          {status === "partial" ? "~" : "-"}
        </span>
      )}
    </span>
  );
}

function NextDraftTargetSection({ nextStep }: { nextStep: string }) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        Next draft target
      </p>
      <div className="rounded-[22px] border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm leading-6 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
        {nextStep}
      </div>
    </section>
  );
}

type ThreadActionBarProps = {
  message: string;
  action?: ReactNode;
};

function ThreadActionBar({ message, action }: ThreadActionBarProps) {
  return (
    <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-5 dark:border-slate-800/80 sm:flex-row sm:items-start sm:justify-between">
      <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        {message}
      </p>
      {action}
    </div>
  );
}

type ThreadLoadingStateProps = {
  nextThreadNumber: number;
};

function ThreadLoadingState({ nextThreadNumber }: ThreadLoadingStateProps) {
  return (
    <section className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-5 py-5 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          Question {nextThreadNumber}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Generating the next thread...
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Completed work stays above while the next practice question is prepared.
      </p>
    </section>
  );
}

type ThreadGenerationErrorProps = {
  message: string;
  onRetry: () => void;
};

function ThreadGenerationError({
  message,
  onRetry,
}: ThreadGenerationErrorProps) {
  return (
    <section className="rounded-[24px] border border-amber-300 bg-amber-50 px-5 py-5 dark:border-amber-500/40 dark:bg-amber-500/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">
        Next question paused
      </p>
      <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
        {message}
      </p>
      <div className="mt-4">
        <button className={primaryButtonClass} onClick={onRetry} type="button">
          Retry generation
        </button>
      </div>
    </section>
  );
}

type SessionCompleteSummaryProps = {
  completedQuestionCount: number;
  sessionLength: PracticeSessionLength;
  onResetSession: () => void;
};

function SessionCompleteSummary({
  completedQuestionCount,
  sessionLength,
  onResetSession,
}: SessionCompleteSummaryProps) {
  return (
    <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/80 px-5 py-6 shadow-sm dark:border-emerald-500/25 dark:bg-emerald-500/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-200">
        Session complete
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
        You completed {completedQuestionCount} of {sessionLength} questions.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-200">
        The finished threads above remain as a record of the full session. Reset
        when you want to start a fresh run with a new question sequence.
      </p>
      <div className="mt-5">
        <button
          className={secondaryButtonClass}
          onClick={onResetSession}
          type="button"
        >
          Start a new session
        </button>
      </div>
    </section>
  );
}

type ThreadBlockProps = {
  align: "left" | "right";
  caption: string;
  tone: "answer" | "feedback";
  headerTrailing?: ReactNode;
  children: ReactNode;
};

function ThreadBlock({
  align,
  caption,
  tone,
  headerTrailing,
  children,
}: ThreadBlockProps) {
  const wrapperClass =
    align === "right" ? "flex justify-end" : "flex justify-start";
  const surfaceClass =
    tone === "answer"
      ? "max-w-[84%] rounded-[28px] bg-slate-950 px-5 py-4 text-white shadow-sm dark:bg-slate-800 dark:text-slate-100 sm:max-w-[76%]"
      : "max-w-[90%] rounded-[28px] bg-slate-100 px-5 py-4 text-slate-800 shadow-sm dark:bg-slate-950 dark:text-slate-100 sm:max-w-[82%]";
  const captionClass =
    tone === "answer"
      ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 dark:text-slate-400"
      : "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

  return (
    <div className={wrapperClass}>
      <section className={surfaceClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={captionClass}>{caption}</p>
          {tone === "feedback" ? null : headerTrailing}
        </div>
        <div className="mt-3">{children}</div>
      </section>
    </div>
  );
}

type DesktopSessionRailProps = {
  onExpand: () => void;
};

function DesktopSessionRail({ onExpand }: DesktopSessionRailProps) {
  return (
    <div className="flex h-full items-start justify-center border-l border-slate-200 bg-white px-2 pt-5 dark:border-slate-800 dark:bg-slate-950">
      <button
        aria-expanded="false"
        aria-label="Reopen practice controls"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
        onClick={onExpand}
        type="button"
      >
        <PanelExpandIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

type MobileSessionDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

function MobileSessionDrawer({
  isOpen,
  onClose,
  children,
}: MobileSessionDrawerProps) {
  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm transition-transform duration-300 xl:hidden ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="h-full overflow-y-auto">
        {children}
        <button
          aria-label="Close session panel"
          className="sr-only"
          onClick={onClose}
          type="button"
        />
      </div>
    </div>
  );
}

function getActiveThread(threads: SessionThread[]) {
  const lastThread = threads[threads.length - 1] ?? null;

  if (!lastThread || lastThread.stage === "complete") {
    return null;
  }

  return lastThread;
}

function createSessionThread(
  question: GenerateQuestionResponse,
  threadNumber: number,
): SessionThread {
  return {
    threadId: `${question.questionId}-${threadNumber}`,
    question,
    attempts: [],
    stage: "question",
    isCollapsed: false,
  };
}

function getPrimaryActionLabel(threadCount: number, hasActiveThread: boolean) {
  if (threadCount > 0 && !hasActiveThread) {
    return "Generate next question";
  }

  return "Generate question";
}

function formatElapsedSeconds(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

function updateActiveThread(
  threads: SessionThread[],
  updater: (thread: SessionThread) => SessionThread,
) {
  const nextThreads = [...threads];
  const lastIndex = nextThreads.length - 1;

  if (lastIndex < 0 || nextThreads[lastIndex].stage === "complete") {
    return threads;
  }

  nextThreads[lastIndex] = updater(nextThreads[lastIndex]);

  return nextThreads;
}

function getCommandWordLabel(
  questionType: GenerateQuestionResponse["questionType"],
) {
  return questionType
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function getImprovementLabel(
  firstAttempt: PracticeAttempt,
  finalAttempt: PracticeAttempt,
) {
  const scoreDelta = finalAttempt.feedback.score - firstAttempt.feedback.score;

  if (scoreDelta > 0) {
    return `Improvement: +${scoreDelta} mark${scoreDelta === 1 ? "" : "s"}`;
  }

  if (scoreDelta < 0) {
    return `Improvement: -${Math.abs(scoreDelta)} mark${
      Math.abs(scoreDelta) === 1 ? "" : "s"
    }`;
  }

  return "Improvement: score unchanged";
}

function getLatestAttempt(thread: SessionThread) {
  return thread.attempts[thread.attempts.length - 1] ?? null;
}

function getNextAttemptNumber(thread: SessionThread) {
  return (getLatestAttempt(thread)?.attemptNumber ?? 0) + 1;
}

function getCompletionThreshold(maxScore: number) {
  return maxScore <= 3 ? maxScore : maxScore - 1;
}

function hasReachedCompletionThreshold(feedback: MarkAnswerResponse) {
  return feedback.score >= getCompletionThreshold(feedback.maxScore);
}

async function readResponseBody(response: Response) {
  return (await response.json().catch(() => null)) as unknown;
}

function getApiErrorMessage(body: unknown, fallback: string) {
  return isApiErrorResponse(body) ? body.error : fallback;
}

function isApiErrorResponse(body: unknown): body is ApiErrorResponse {
  return isRecord(body) && "error" in body && typeof body.error === "string";
}

function isGenerateQuestionResponse(
  body: unknown,
): body is GenerateQuestionResponse {
  return (
    isRecord(body) &&
    typeof body.questionId === "string" &&
    typeof body.questionText === "string" &&
    typeof body.marks === "number" &&
    isPracticeQuestionCommandWord(body.questionType) &&
    typeof body.topicId === "string" &&
    typeof body.topicLabel === "string" &&
    typeof body.subtopicId === "string" &&
    typeof body.subtopicLabel === "string" &&
    typeof body.answerFocus === "string" &&
    isPracticeMarkingStyle(body.markingStyle) &&
    Array.isArray(body.rubricPoints) &&
    body.rubricPoints.every((point) => {
      return (
        isRecord(point) &&
        typeof point.id === "number" &&
        typeof point.pointText === "string" &&
        typeof point.orderNumber === "number"
      );
    }) &&
    Array.isArray(body.levelDescriptors) &&
    body.levelDescriptors.every((descriptor) => {
      return (
        isRecord(descriptor) &&
        typeof descriptor.levelNumber === "number" &&
        typeof descriptor.minMark === "number" &&
        typeof descriptor.maxMark === "number" &&
        typeof descriptor.descriptorText === "string" &&
        (descriptor.communicationRequirement === null ||
          typeof descriptor.communicationRequirement === "string")
      );
    })
  );
}

function isMarkAnswerResponse(body: unknown): body is MarkAnswerResponse {
  return (
    isRecord(body) &&
    typeof body.score === "number" &&
    typeof body.maxScore === "number" &&
    (body.level === null || typeof body.level === "number") &&
    (body.levelReasoning === null || typeof body.levelReasoning === "string") &&
    Array.isArray(body.rubricAssessment) &&
    body.rubricAssessment.every((assessment) => {
      return (
        isRecord(assessment) &&
        typeof assessment.pointText === "string" &&
        isRubricAssessmentStatus(assessment.status) &&
        typeof assessment.evidence === "string" &&
        typeof assessment.reason === "string"
      );
    }) &&
    isRecord(body.feedback) &&
    typeof body.feedback.nextStep === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPracticeMarkingStyle(value: unknown): value is "points" | "levels" {
  return value === "points" || value === "levels";
}

function isRubricAssessmentStatus(
  value: unknown,
): value is "present" | "partial" | "absent" {
  return value === "present" || value === "partial" || value === "absent";
}

function PanelExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 5v14m4-12.25 5.25 5.25L11 17.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ThreadDisclosureIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6.75 9.75 5.25 5.25 5.25-5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
