"use client";

import { useMemo, useState, type ReactNode } from "react";
import Breadcrumbs from "@/components/breadcrumbs";
import PracticeInputBar from "@/components/practice/practice-input-bar";
import PracticeSessionPanel from "@/components/practice/practice-session-panel";
import {
  type MockPracticeFeedback,
  type PracticeQuestion,
  type PracticeQuestionType,
  type PracticeSessionLength,
  getEligiblePracticeQuestions,
} from "@/lib/mock-biology-practice";

type WorkspaceSelectedSubtopic = {
  id: string;
  name: string;
  code: string;
  moduleLabel: string;
  moduleName: string;
  topicName: string;
};

type PracticeWorkspaceShellProps = {
  subjectName: string;
  subjectSlug: string;
  selectedSubtopics: WorkspaceSelectedSubtopic[];
  isSessionPanelOpen: boolean;
  onCloseSessionPanel: () => void;
  onOpenSessionPanel: () => void;
  onOpenSidebar: () => void;
};

type PracticeStage = "ready" | "question" | "feedback" | "improving";

type PracticeAttempt = {
  attemptNumber: 1 | 2;
  answer: string;
  feedback: MockPracticeFeedback;
};

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-sky-600 dark:hover:bg-sky-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

export default function PracticeWorkspaceShell({
  subjectName,
  subjectSlug,
  selectedSubtopics,
  isSessionPanelOpen,
  onCloseSessionPanel,
  onOpenSessionPanel,
  onOpenSidebar,
}: PracticeWorkspaceShellProps) {
  const [stage, setStage] = useState<PracticeStage>("ready");
  const [questionType, setQuestionType] = useState<PracticeQuestionType>("mixed");
  const [sessionLength, setSessionLength] = useState<PracticeSessionLength>(5);
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion | null>(
    null,
  );
  const [answerDraft, setAnswerDraft] = useState("");
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [questionCursor, setQuestionCursor] = useState(0);
  const [completedQuestionCount, setCompletedQuestionCount] = useState(0);
  const [showNoEligibleMessage, setShowNoEligibleMessage] = useState(false);
  const [isDesktopSessionPanelCollapsed, setIsDesktopSessionPanelCollapsed] =
    useState(false);

  const selectedSubtopicIds = useMemo(() => {
    return selectedSubtopics.map((subtopic) => subtopic.id);
  }, [selectedSubtopics]);

  const eligibleQuestions = useMemo(() => {
    return getEligiblePracticeQuestions(selectedSubtopicIds, questionType);
  }, [questionType, selectedSubtopicIds]);

  const currentQuestionContext = useMemo(() => {
    if (!currentQuestion) {
      return null;
    }

    return (
      selectedSubtopics.find(
        (subtopic) => subtopic.id === currentQuestion.subtopicId,
      ) ?? null
    );
  }, [currentQuestion, selectedSubtopics]);

  const hasSelectedTopics = selectedSubtopics.length > 0;
  const isSessionComplete = completedQuestionCount >= sessionLength;
  const isActivePracticeStage =
    stage === "question" || stage === "feedback" || stage === "improving";
  const canResetSession =
    currentQuestion !== null ||
    attempts.length > 0 ||
    answerDraft.trim().length > 0 ||
    completedQuestionCount > 0 ||
    showNoEligibleMessage;
  const shouldShowComposer = stage === "question" || stage === "improving";

  function resetSession() {
    setStage("ready");
    setCurrentQuestion(null);
    setAnswerDraft("");
    setAttempts([]);
    setQuestionCursor(0);
    setCompletedQuestionCount(0);
    setShowNoEligibleMessage(false);
    setIsDesktopSessionPanelCollapsed(false);
  }

  function handleQuestionTypeChange(nextType: PracticeQuestionType) {
    setQuestionType(nextType);
    resetSession();
  }

  function handleGenerateQuestion() {
    if (selectedSubtopicIds.length === 0) {
      return;
    }

    if (eligibleQuestions.length === 0) {
      setStage("ready");
      setCurrentQuestion(null);
      setAnswerDraft("");
      setAttempts([]);
      setShowNoEligibleMessage(true);
      return;
    }

    const nextQuestion =
      eligibleQuestions[questionCursor % eligibleQuestions.length] ?? null;

    if (!nextQuestion) {
      setShowNoEligibleMessage(true);
      return;
    }

    // TODO: Replace this local question selection with a real AI generation request.
    setCurrentQuestion(nextQuestion);
    setQuestionCursor((current) => current + 1);
    setAnswerDraft("");
    setAttempts([]);
    setStage("question");
    setShowNoEligibleMessage(false);
    setIsDesktopSessionPanelCollapsed(true);
  }

  function handleSubmitAnswer() {
    if (!currentQuestion) {
      return;
    }

    const trimmedAnswer = answerDraft.trim();

    if (!trimmedAnswer) {
      return;
    }

    const nextAttemptNumber: 1 | 2 = stage === "improving" ? 2 : 1;
    const nextAttempt: PracticeAttempt = {
      attemptNumber: nextAttemptNumber,
      answer: trimmedAnswer,
      feedback:
        nextAttemptNumber === 1
          ? currentQuestion.firstAttemptFeedback
          : currentQuestion.improvedAttemptFeedback,
    };

    // TODO: Replace this mock marking step with a real AI feedback response.
    setAttempts((current) => {
      if (nextAttemptNumber === 1) {
        return [nextAttempt];
      }

      return current.length > 0 ? [current[0], nextAttempt] : [nextAttempt];
    });

    if (nextAttemptNumber === 1) {
      setCompletedQuestionCount((current) => current + 1);
    }

    setStage("feedback");
    setAnswerDraft(trimmedAnswer);
  }

  function handleImproveAnswer() {
    if (attempts.length === 0) {
      return;
    }

    setAnswerDraft(attempts[0].answer);
    setStage("improving");
  }

  const primaryActionLabel = getPrimaryActionLabel(stage, currentQuestion);
  const sessionProgressLabel = `${completedQuestionCount} / ${sessionLength} completed`;
  const sessionProgressMessage = isSessionComplete
    ? "Session target reached. You can keep going with extra questions."
    : `${Math.max(sessionLength - completedQuestionCount, 0)} question${
        sessionLength - completedQuestionCount === 1 ? "" : "s"
      } left in this local session.`;
  const desktopLayoutClass = isDesktopSessionPanelCollapsed
    ? "xl:grid-cols-[minmax(0,1fr)_3.75rem]"
    : "xl:grid-cols-[minmax(0,1fr)_320px]";

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
                  Focus on one Biology prompt at a time, then use the review to
                  tighten the next answer.
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
                  ? `${selectedSubtopics.length} topic${
                      selectedSubtopics.length === 1 ? "" : "s"
                    } selected`
                  : `No topics selected in ${subjectName}`}
              </InlineStatusPill>
              <InlineStatusPill>{sessionProgressLabel}</InlineStatusPill>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[1000px] flex-col px-4 py-4 sm:px-5 xl:px-6">
                {stage === "ready" ? (
                  <PracticeWorkspaceReadyState
                    hasSelectedTopics={hasSelectedTopics}
                    selectedTopicCount={selectedSubtopics.length}
                  />
                ) : currentQuestion ? (
                  <PracticeConversationThread
                    attempts={attempts}
                    currentQuestion={currentQuestion}
                    isImproving={stage === "improving"}
                    onImproveAnswer={
                      stage === "feedback" && attempts.length === 1
                        ? handleImproveAnswer
                        : null
                    }
                    selectedContext={currentQuestionContext}
                    stage={stage}
                  />
                ) : (
                  <PracticeWorkspaceReadyState
                    hasSelectedTopics={hasSelectedTopics}
                    selectedTopicCount={selectedSubtopics.length}
                  />
                )}
              </div>
            </div>

            {shouldShowComposer ? (
              <div className="bg-gradient-to-t from-slate-50 via-slate-50/96 to-transparent px-4 pb-4 pt-3 dark:from-slate-950 dark:via-slate-950/96 dark:to-transparent sm:px-5 sm:pb-5 xl:px-6">
                <div className="mx-auto w-full max-w-[1000px]">
                  <PracticeInputBar
                    onSubmit={handleSubmitAnswer}
                    onValueChange={setAnswerDraft}
                    submitDisabled={answerDraft.trim().length === 0}
                    value={answerDraft}
                  />
                </div>
              </div>
            ) : null}
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
              isDeemphasized={isActivePracticeStage}
              isSessionComplete={isSessionComplete}
              onCollapse={() => setIsDesktopSessionPanelCollapsed(true)}
              onGenerateQuestion={handleGenerateQuestion}
              onQuestionTypeChange={handleQuestionTypeChange}
              onResetSession={resetSession}
              onSessionLengthChange={setSessionLength}
              progressLabel={sessionProgressLabel}
              progressMessage={sessionProgressMessage}
              questionType={questionType}
              selectedSubtopics={selectedSubtopics}
              sessionLength={sessionLength}
              showNoEligibleMessage={showNoEligibleMessage}
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
          isDeemphasized={isActivePracticeStage}
          isSessionComplete={isSessionComplete}
          onClose={onCloseSessionPanel}
          onGenerateQuestion={handleGenerateQuestion}
          onQuestionTypeChange={handleQuestionTypeChange}
          onResetSession={resetSession}
          onSessionLengthChange={setSessionLength}
          progressLabel={sessionProgressLabel}
          progressMessage={sessionProgressMessage}
          questionType={questionType}
          selectedSubtopics={selectedSubtopics}
          sessionLength={sessionLength}
          showNoEligibleMessage={showNoEligibleMessage}
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
          Select topics and generate a question to start practicing.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {hasSelectedTopics
            ? `${selectedTopicCount} topic${
                selectedTopicCount === 1 ? "" : "s"
              } selected. Use the controls pane to generate the next Biology question.`
            : "Use the syllabus pane to choose modules, topics, or subtopics first."}
        </p>
      </div>
    </section>
  );
}

type PracticeConversationThreadProps = {
  stage: PracticeStage;
  currentQuestion: PracticeQuestion;
  attempts: PracticeAttempt[];
  isImproving: boolean;
  onImproveAnswer: (() => void) | null;
  selectedContext: WorkspaceSelectedSubtopic | null;
};

function PracticeConversationThread({
  stage,
  currentQuestion,
  attempts,
  isImproving,
  onImproveAnswer,
  selectedContext,
}: PracticeConversationThreadProps) {
  const hasTurns = attempts.length > 0;
  const isThreadComplete = stage === "feedback" && attempts.length > 1;

  return (
    <article className="space-y-6 pb-3 sm:space-y-7 sm:pb-5">
      <div className="sticky top-0 z-10 -mx-4 bg-slate-50/95 px-4 pb-4 pt-1 backdrop-blur dark:bg-slate-950/95 sm:-mx-5 sm:px-5 xl:-mx-6 xl:px-6">
        <QuestionThreadHeader
          isCondensed={hasTurns || isImproving}
          question={currentQuestion}
          selectedContext={selectedContext}
        />
      </div>

      {hasTurns ? (
        <div className="space-y-5">
          {attempts.map((attempt) => (
            <ThreadTurn
              attempt={attempt}
              key={attempt.attemptNumber}
              maxMarks={currentQuestion.maxMarks}
            />
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
          message="Review the feedback, then write a stronger second attempt in the composer below."
        />
      ) : null}

      {isImproving ? (
        <ThreadActionBar message="Drafting attempt 2. Your revised answer will appear here as the next turn once you submit it." />
      ) : null}

      {isThreadComplete ? (
        <ThreadCompleteSummary
          attempts={attempts}
          maxMarks={currentQuestion.maxMarks}
        />
      ) : null}
    </article>
  );
}

type QuestionThreadHeaderProps = {
  question: PracticeQuestion;
  selectedContext: WorkspaceSelectedSubtopic | null;
  isCondensed: boolean;
};

function QuestionThreadHeader({
  question,
  selectedContext,
  isCondensed,
}: QuestionThreadHeaderProps) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white/92 px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/92 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-sky-200">
              {question.questionLabel}
            </span>
            {selectedContext ? (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {selectedContext.topicName} / {selectedContext.name}
              </span>
            ) : null}
          </div>

          <p
            className={`max-w-4xl font-semibold tracking-tight text-slate-950 dark:text-white ${
              isCondensed
                ? "text-lg leading-8 sm:text-xl sm:leading-9"
                : "text-2xl leading-10 sm:text-[2rem] sm:leading-[1.45]"
            }`}
          >
            {question.prompt}
          </p>
        </div>

        <div className="shrink-0">
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {question.maxMarks} marks
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">
          Answer focus:
        </span>{" "}
        {question.focus}
      </p>
    </section>
  );
}

function ThreadStartState() {
  return (
    <section className="flex justify-center py-6">
      <div className="max-w-xl text-center text-sm leading-7 text-slate-500 dark:text-slate-400">
        Your first answer will appear here as the opening turn in this practice
        thread.
      </div>
    </section>
  );
}

type ThreadTurnProps = {
  attempt: PracticeAttempt;
  maxMarks: number;
};

function ThreadTurn({ attempt, maxMarks }: ThreadTurnProps) {
  return (
    <div className="space-y-4">
      <ThreadBlock
        align="right"
        caption={`Your answer · Attempt ${attempt.attemptNumber}`}
        tone="answer"
      >
        <p className="whitespace-pre-wrap text-sm leading-7 text-inherit">
          {attempt.answer}
        </p>
      </ThreadBlock>

      <ThreadBlock
        align="left"
        caption={`AI review · Attempt ${attempt.attemptNumber}`}
        headerTrailing={
          <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {attempt.feedback.awardedMarks}/{maxMarks}
          </span>
        }
        tone="feedback"
      >
        <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">
          {attempt.feedback.overallComment}
        </p>

        <div className="mt-5 space-y-5">
          <FeedbackList
            items={attempt.feedback.awardedPoints}
            title="What is already working"
            tone="positive"
          />
          <FeedbackList
            items={attempt.feedback.missingPoints}
            title="What to tighten"
            tone="neutral"
          />
          <FeedbackList
            items={attempt.feedback.improvementAdvice}
            title="Improve the next draft"
            tone="advice"
          />
        </div>
      </ThreadBlock>
    </div>
  );
}

type FeedbackListProps = {
  title: string;
  items: string[];
  tone: "positive" | "neutral" | "advice";
};

function FeedbackList({ title, items, tone }: FeedbackListProps) {
  const markerClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "advice"
        ? "text-sky-700 dark:text-sky-300"
        : "text-amber-600 dark:text-amber-300";

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        {title}
      </p>
      <ul className="space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className={`${markerClass} mt-[2px]`}>-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
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

type ThreadCompleteSummaryProps = {
  attempts: PracticeAttempt[];
  maxMarks: number;
};

function ThreadCompleteSummary({
  attempts,
  maxMarks,
}: ThreadCompleteSummaryProps) {
  const firstAttempt = attempts[0];
  const finalAttempt = attempts[attempts.length - 1];
  const scoreDelta =
    finalAttempt.feedback.awardedMarks - firstAttempt.feedback.awardedMarks;
  const deltaLabel =
    scoreDelta > 0
      ? `Up ${scoreDelta} mark${scoreDelta === 1 ? "" : "s"}`
      : scoreDelta < 0
        ? `Down ${Math.abs(scoreDelta)} mark${
            Math.abs(scoreDelta) === 1 ? "" : "s"
          }`
        : "Score unchanged";

  return (
    <section className="flex justify-start border-t border-slate-200/80 pt-5 dark:border-slate-800/80">
      <div className="max-w-xl rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
            Thread complete
          </p>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {deltaLabel}
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
          Final score:{" "}
          <span className="font-semibold text-slate-950 dark:text-white">
            {finalAttempt.feedback.awardedMarks}/{maxMarks}
          </span>
          . You can move on to the next question whenever you are ready.
        </p>
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
      : "max-w-[90%] rounded-[28px] bg-slate-100 px-5 py-4 text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-100 sm:max-w-[82%]";
  const captionClass =
    tone === "answer"
      ? "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 dark:text-slate-400"
      : "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

  return (
    <div className={wrapperClass}>
      <section className={surfaceClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={captionClass}>{caption}</p>
          {headerTrailing}
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

function getPrimaryActionLabel(
  stage: PracticeStage,
  currentQuestion: PracticeQuestion | null,
) {
  if (stage === "feedback" || stage === "improving") {
    return "Next question";
  }

  if (currentQuestion) {
    return "Generate new question";
  }

  return "Generate question";
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
