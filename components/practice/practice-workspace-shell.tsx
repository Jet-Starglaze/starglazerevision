"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import Breadcrumbs from "@/components/breadcrumbs";
import DesktopSidebarToggle from "@/components/practice/desktop-sidebar-toggle";
import PracticeInputBar from "@/components/practice/practice-input-bar";
import PracticeSessionPanel from "@/components/practice/practice-session-panel";
import { formatRubricPointDisplayText } from "@/lib/marking/rubric-display";
import { hasReachedPracticeCompletionThreshold } from "@/lib/practice-completion";
import {
  derivePracticeHints,
  derivePracticeReviewState,
  isStuckPracticeAnswer,
  MAX_PRACTICE_HINT_LEVEL,
  type PracticeHintLevel,
  type PracticeReviewState,
} from "@/lib/practice-guidance";
import type {
  ApiErrorResponse,
  GenerateQuestionSelectionStrategy,
  GenerateQuestionResponse,
  MarkAnswerResponse,
  PracticeReviewSource,
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
  selectionKey: string;
  selectedSubtopicIds: number[];
  selectedSubtopics: WorkspaceSelectedSubtopic[];
  isPhoneLayout: boolean;
  isSessionPanelOpen: boolean;
  onCloseSessionPanel: () => void;
  onOpenSessionPanel: () => void;
  onOpenSidebar: () => void;
};

type ThreadStage = "question" | "feedback" | "improving" | "complete" | "skipped";

type AttemptRevealStage = "score" | "focused";

type AttemptRevealStateMap = Partial<Record<string, AttemptRevealStage>>;
type HintRevealStateMap = Partial<Record<string, number>>;
type StuckPromptStateMap = Partial<Record<string, boolean>>;

type PracticeAttempt = {
  attemptNumber: number;
  answer: string;
  feedback: MarkAnswerResponse;
  isFeedbackCollapsed: boolean;
};

type SessionThread = {
  threadId: string;
  question: GenerateQuestionResponse;
  attempts: PracticeAttempt[];
  stage: ThreadStage;
  isCollapsed: boolean;
};

type PrefetchedNextQuestionSlot = {
  question: GenerateQuestionResponse;
  slotKey: string;
};

type PrefetchedNextQuestionRequest = {
  contextKey: string;
  promise: Promise<GenerateQuestionResponse | null>;
};

type FetchGeneratedQuestionOptions = {
  excludeQuestionIds: number[];
  requestToken: number;
  selectionStrategy?: GenerateQuestionSelectionStrategy;
  suppressErrors?: boolean;
};

type PendingAnswerReview = {
  threadId: string;
  attemptNumber: number;
  submittedAnswer: string;
};

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-sky-600 dark:hover:bg-sky-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500";

const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200";

const DEFAULT_QUESTION_FILTER_MODE: PracticeQuestionFilterMode = "mixed";
const DEFAULT_SESSION_LENGTH: PracticeSessionLength = 5;
const MARKING_PROGRESS_MESSAGES = [
  "Analyzing answer...",
  "Checking key biological concepts...",
  "Comparing to mark scheme...",
  "Finalising score...",
] as const;
const MARKING_PROGRESS_INTERVAL_MS = 1200;
const ATTEMPT_REVEAL_DELAY_MS = 300;
const PHONE_STICKY_BAR_CLEARANCE = "calc(env(safe-area-inset-bottom, 0px) + 9rem)";
const SHOULD_LOG_CLIENT_MARKING = process.env.NODE_ENV === "development";

export default function PracticeWorkspaceShell({
  subjectName,
  subjectSlug,
  selectionKey,
  selectedSubtopicIds,
  selectedSubtopics,
  isPhoneLayout,
  isSessionPanelOpen,
  onCloseSessionPanel,
  onOpenSessionPanel,
  onOpenSidebar,
}: PracticeWorkspaceShellProps) {
  const [questionFilterMode, setQuestionFilterMode] =
    useState<PracticeQuestionFilterMode>(DEFAULT_QUESTION_FILTER_MODE);
  const [sessionLength, setSessionLength] =
    useState<PracticeSessionLength>(DEFAULT_SESSION_LENGTH);
  const [sessionThreads, setSessionThreads] = useState<SessionThread[]>([]);
  const [prefetchedNextQuestion, setPrefetchedNextQuestion] =
    useState<PrefetchedNextQuestionSlot | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [questionCursor, setQuestionCursor] = useState(0);
  const [completedQuestionCount, setCompletedQuestionCount] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isMarkingAnswer, setIsMarkingAnswer] = useState(false);
  const [isSkippingQuestion, setIsSkippingQuestion] = useState(false);
  const [pendingAnswerReview, setPendingAnswerReview] =
    useState<PendingAnswerReview | null>(null);
  const [attemptRevealState, setAttemptRevealState] =
    useState<AttemptRevealStateMap>({});
  const [hintRevealState, setHintRevealState] = useState<HintRevealStateMap>({});
  const [stuckPromptState, setStuckPromptState] =
    useState<StuckPromptStateMap>({});
  const [answerReviewStartedAt, setAnswerReviewStartedAt] = useState<number | null>(
    null,
  );
  const [answerReviewElapsedMs, setAnswerReviewElapsedMs] = useState(0);
  const [isDesktopSessionPanelCollapsed, setIsDesktopSessionPanelCollapsed] =
    useState(false);
  const [composerFocusSequence, setComposerFocusSequence] = useState(0);
  const [mobileActionBarOffset, setMobileActionBarOffset] = useState(0);
  const [isPhoneHistoryExpanded, setIsPhoneHistoryExpanded] = useState(false);
  const centerScrollContainerRef = useRef<HTMLDivElement>(null);
  const previousSelectionKeyRef = useRef(selectionKey);
  const sessionRequestTokenRef = useRef(0);
  const prefetchedNextQuestionRef =
    useRef<PrefetchedNextQuestionSlot | null>(null);
  const prefetchedNextQuestionRequestRef =
    useRef<PrefetchedNextQuestionRequest | null>(null);
  const currentPrefetchSlotKeyRef = useRef("");
  const attemptRevealTimeoutIdsRef = useRef<number[]>([]);
  const sessionThreadsRef = useRef<SessionThread[]>(sessionThreads);

  sessionThreadsRef.current = sessionThreads;

  const activeThread = getActiveThread(sessionThreads);
  const archivedThreads = useMemo(
    () =>
      sessionThreads.filter(
        (thread) => thread.stage === "complete" || thread.stage === "skipped",
      ),
    [sessionThreads],
  );
  const currentQuestion = activeThread?.question ?? null;
  const currentQuestionId = currentQuestion?.questionId ?? null;
  const sessionQuestionIds = useMemo(
    () => getSessionQuestionIds(sessionThreads),
    [sessionThreads],
  );
  const sessionQuestionIdsKey = buildSessionQuestionIdsKey(sessionQuestionIds);
  const prefetchScopeKey = buildPrefetchScopeKey(
    selectionKey,
    questionFilterMode,
  );
  const prefetchSlotKey = buildPrefetchSlotKey(
    prefetchScopeKey,
    sessionQuestionIdsKey,
  );
  const prefetchRequestContextKey = buildPrefetchRequestContextKey(
    prefetchSlotKey,
    currentQuestionId,
  );
  const hasSelectedTopics = selectedSubtopics.length > 0;
  const isSessionComplete =
    completedQuestionCount >= sessionLength &&
    sessionThreads.length > 0 &&
    activeThread === null;
  currentPrefetchSlotKeyRef.current = isSessionComplete ? "" : prefetchSlotKey;
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
  const canGenerateQuestion =
    hasSelectedTopics &&
    !isGeneratingQuestion &&
    activeThread === null &&
    !isSessionComplete;
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
  const pendingReviewProgressMessage = pendingAnswerReview
    ? getMarkingProgressMessage(answerReviewElapsedMs)
    : null;
  const activeThreadNumber = activeThread
    ? getThreadNumber(sessionThreads, activeThread.threadId)
    : null;
  const shouldShowPhoneStickyActionBar =
    isPhoneLayout &&
    activeThread !== null &&
    isComposerVisibleForStage(activeThread.stage);
  const hasValidPrefetchedNextQuestion = isPrefetchedQuestionSlotValid(
    prefetchedNextQuestion,
    prefetchSlotKey,
    sessionQuestionIds,
  );

  function setPrefetchedNextQuestionSlot(
    nextSlot: PrefetchedNextQuestionSlot | null,
  ) {
    prefetchedNextQuestionRef.current = nextSlot;
    setPrefetchedNextQuestion(nextSlot);
  }

  function clearPrefetchedNextQuestionSlot() {
    setPrefetchedNextQuestionSlot(null);
  }

  function invalidatePrefetchedQuestionState() {
    currentPrefetchSlotKeyRef.current = "";
    clearPrefetchedNextQuestionSlot();
    prefetchedNextQuestionRequestRef.current = null;
  }

  function clearAttemptRevealTimeouts() {
    attemptRevealTimeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    attemptRevealTimeoutIdsRef.current = [];
  }

  function registerAttemptRevealTimeout(callback: () => void, delay: number) {
    const timeoutId = window.setTimeout(() => {
      attemptRevealTimeoutIdsRef.current =
        attemptRevealTimeoutIdsRef.current.filter(
          (currentTimeoutId) => currentTimeoutId !== timeoutId,
        );
      callback();
    }, delay);

    attemptRevealTimeoutIdsRef.current = [
      ...attemptRevealTimeoutIdsRef.current,
      timeoutId,
    ];
  }

  function beginAttemptReveal(threadId: string, attemptNumber: number) {
    const attemptRevealKey = getAttemptRevealKey(threadId, attemptNumber);

    setAttemptRevealState((current) => ({
      ...current,
      [attemptRevealKey]: "score",
    }));

    registerAttemptRevealTimeout(() => {
      setAttemptRevealState((current) => {
        if (current[attemptRevealKey] !== "score") {
          return current;
        }

        return {
          ...current,
          [attemptRevealKey]: "focused",
        };
      });
    }, ATTEMPT_REVEAL_DELAY_MS);
  }

  function revealNextHint(threadId: string) {
    setHintRevealState((current) => ({
      ...current,
      [threadId]: Math.min(
        MAX_PRACTICE_HINT_LEVEL,
        (current[threadId] ?? 0) + 1,
      ),
    }));
    setStuckPromptState((current) => ({
      ...current,
      [threadId]: false,
    }));
    setComposerFocusSequence((current) => current + 1);
  }

  function consumePrefetchedNextQuestionIfValid() {
    const nextSlot = prefetchedNextQuestionRef.current;

    if (!nextSlot) {
      return null;
    }

    if (!isPrefetchedQuestionSlotValid(nextSlot, prefetchSlotKey, sessionQuestionIds)) {
      if (nextSlot) {
        clearPrefetchedNextQuestionSlot();
      }

      return null;
    }

    clearPrefetchedNextQuestionSlot();
    return nextSlot.question;
  }

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

  useEffect(() => {
    if (!isPhoneLayout) {
      setMobileActionBarOffset(0);
      return;
    }

    const visualViewport = window.visualViewport;
    const updateMobileActionBarOffset = () => {
      const nextOffset = visualViewport
        ? Math.max(
            Math.round(
              window.innerHeight -
                visualViewport.height -
                visualViewport.offsetTop,
            ),
            0,
          )
        : 0;

      setMobileActionBarOffset((current) =>
        current === nextOffset ? current : nextOffset,
      );
    };

    updateMobileActionBarOffset();

    window.addEventListener("resize", updateMobileActionBarOffset);
    visualViewport?.addEventListener("resize", updateMobileActionBarOffset);
    visualViewport?.addEventListener("scroll", updateMobileActionBarOffset);

    return () => {
      window.removeEventListener("resize", updateMobileActionBarOffset);
      visualViewport?.removeEventListener("resize", updateMobileActionBarOffset);
      visualViewport?.removeEventListener("scroll", updateMobileActionBarOffset);
    };
  }, [isPhoneLayout]);

  useEffect(() => {
    return () => {
      attemptRevealTimeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      attemptRevealTimeoutIdsRef.current = [];
    };
  }, []);

  const scrollMainContentToTop = useCallback(() => {
    const scrollContainer = centerScrollContainerRef.current;

    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, []);

  const resetSessionState = useCallback(({
    resetControls = false,
    scrollToTop = false,
  }: {
    resetControls?: boolean;
    scrollToTop?: boolean;
  } = {}) => {
    sessionRequestTokenRef.current += 1;
    setSessionThreads([]);
    currentPrefetchSlotKeyRef.current = "";
    prefetchedNextQuestionRef.current = null;
    setPrefetchedNextQuestion(null);
    prefetchedNextQuestionRequestRef.current = null;
    setAnswerDraft("");
    setQuestionCursor(0);
    setCompletedQuestionCount(0);
    setGenerationError(null);
    setAnswerError(null);
    setIsGeneratingQuestion(false);
    setIsMarkingAnswer(false);
    setIsSkippingQuestion(false);
    setPendingAnswerReview(null);
    setAttemptRevealState({});
    setHintRevealState({});
    setStuckPromptState({});
    clearAttemptRevealTimeouts();
    setAnswerReviewStartedAt(null);
    setAnswerReviewElapsedMs(0);
    setIsDesktopSessionPanelCollapsed(false);
    setIsPhoneHistoryExpanded(false);
    setComposerFocusSequence(0);

    if (resetControls) {
      setQuestionFilterMode(DEFAULT_QUESTION_FILTER_MODE);
      setSessionLength(DEFAULT_SESSION_LENGTH);
    }

    if (scrollToTop) {
      scrollMainContentToTop();
    }
  }, [scrollMainContentToTop]);

  useEffect(() => {
    if (previousSelectionKeyRef.current === selectionKey) {
      return;
    }

    previousSelectionKeyRef.current = selectionKey;
    resetSessionState({ resetControls: true, scrollToTop: true });
  }, [resetSessionState, selectionKey]);

  useEffect(() => {
    if (
      prefetchedNextQuestion !== null &&
      !isPrefetchedQuestionSlotValid(
        prefetchedNextQuestion,
        prefetchSlotKey,
        sessionQuestionIds,
      )
    ) {
      prefetchedNextQuestionRef.current = null;
      setPrefetchedNextQuestion(null);
    }
  }, [prefetchedNextQuestion, prefetchSlotKey, sessionQuestionIds]);

  const fetchGeneratedQuestion = useCallback(
    async ({
      excludeQuestionIds,
      requestToken,
      selectionStrategy = "weighted",
      suppressErrors = false,
    }: FetchGeneratedQuestionOptions) => {
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subjectId: subjectSlug,
          selectedSubtopicIds,
          excludeQuestionIds,
          questionFilterMode,
          sessionLength,
          questionCursor,
          selectionStrategy,
        }),
      });
      const body = await readResponseBody(response);

      if (requestToken !== sessionRequestTokenRef.current) {
        return null;
      }

      if (!response.ok) {
        if (!suppressErrors) {
          setGenerationError(
            getApiErrorMessage(body, "Could not generate a question right now."),
          );
        }
        return null;
      }

      if (!isGenerateQuestionResponse(body)) {
        if (!suppressErrors) {
          setGenerationError("Could not generate a question right now.");
        }
        return null;
      }

      return body;
    },
    [
      questionCursor,
      questionFilterMode,
      selectedSubtopicIds,
      sessionLength,
      subjectSlug,
    ],
  );

  useEffect(() => {
    if (!currentQuestionId || isSessionComplete || hasValidPrefetchedNextQuestion) {
      return;
    }

    if (
      prefetchedNextQuestionRequestRef.current?.contextKey ===
      prefetchRequestContextKey
    ) {
      return;
    }

    const requestToken = sessionRequestTokenRef.current;
    const prefetchPromise = fetchGeneratedQuestion({
      excludeQuestionIds: sessionQuestionIds,
      requestToken,
      selectionStrategy: "weighted",
      suppressErrors: true,
    })
      .then((nextQuestion) => {
        if (!nextQuestion || requestToken !== sessionRequestTokenRef.current) {
          return null;
        }

        if (currentPrefetchSlotKeyRef.current !== prefetchSlotKey) {
          return null;
        }

        if (sessionQuestionIds.includes(Number(nextQuestion.questionId))) {
          return null;
        }

        const nextSlot: PrefetchedNextQuestionSlot = {
          question: nextQuestion,
          slotKey: prefetchSlotKey,
        };

        setPrefetchedNextQuestionSlot(nextSlot);

        return nextQuestion;
      })
      .catch(() => null)
      .finally(() => {
        if (
          prefetchedNextQuestionRequestRef.current?.contextKey ===
          prefetchRequestContextKey
        ) {
          prefetchedNextQuestionRequestRef.current = null;
        }
      });

    prefetchedNextQuestionRequestRef.current = {
      contextKey: prefetchRequestContextKey,
      promise: prefetchPromise,
    };
  }, [
    currentQuestionId,
    fetchGeneratedQuestion,
    hasValidPrefetchedNextQuestion,
    isSessionComplete,
    prefetchRequestContextKey,
    prefetchSlotKey,
    sessionQuestionIds,
  ]);

  function resetSession() {
    resetSessionState({ scrollToTop: true });
  }

  function handleQuestionFilterModeChange(
    nextFilterMode: PracticeQuestionFilterMode,
  ) {
    setQuestionFilterMode(nextFilterMode);
    resetSessionState({ scrollToTop: true });
  }

  function handleSessionLengthChange(nextLength: PracticeSessionLength) {
    setSessionLength(nextLength);
  }

  function handleAnswerDraftChange(nextValue: string) {
    setAnswerDraft(nextValue);

    if (answerError) {
      setAnswerError(null);
    }

    if (activeThread && !isStuckPracticeAnswer(nextValue)) {
      setStuckPromptState((current) => ({
        ...current,
        [activeThread.threadId]: false,
      }));
    }
  }

  function appendGeneratedThread(question: GenerateQuestionResponse) {
    currentPrefetchSlotKeyRef.current = "";
    clearPrefetchedNextQuestionSlot();
    prefetchedNextQuestionRequestRef.current = null;
    setSessionThreads((current) => [
      ...current,
      createSessionThread(question, current.length + 1),
    ]);
    setQuestionCursor((current) => current + 1);
    setAnswerDraft("");
    setGenerationError(null);
    setAnswerError(null);
    setIsDesktopSessionPanelCollapsed(true);
    setComposerFocusSequence((current) => current + 1);
  }

  async function advanceToNextQuestion({
    requestToken,
    nextCompletedQuestionCount,
  }: {
    requestToken: number;
    nextCompletedQuestionCount: number;
  }) {
    if (nextCompletedQuestionCount >= sessionLength) {
      invalidatePrefetchedQuestionState();
      return;
    }

    const prefetchedQuestion = consumePrefetchedNextQuestionIfValid();

    if (prefetchedQuestion) {
      appendGeneratedThread(prefetchedQuestion);
      return;
    }

    setIsGeneratingQuestion(true);

    try {
      const currentPrefetchRequest = prefetchedNextQuestionRequestRef.current;

      if (currentPrefetchRequest?.contextKey === prefetchRequestContextKey) {
        await currentPrefetchRequest.promise;
      }

      const awaitedPrefetchedQuestion = consumePrefetchedNextQuestionIfValid();

      if (awaitedPrefetchedQuestion) {
        appendGeneratedThread(awaitedPrefetchedQuestion);
        return;
      }

      const nextQuestion = await fetchGeneratedQuestion({
        excludeQuestionIds: sessionQuestionIds,
        requestToken,
        selectionStrategy: "weighted",
      });

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
    const selectionStrategy: GenerateQuestionSelectionStrategy =
      sessionThreads.length === 0 && completedQuestionCount === 0
        ? "fast-initial"
        : "weighted";

    setGenerationError(null);
    setAnswerError(null);
    const prefetchedQuestion = consumePrefetchedNextQuestionIfValid();

    if (prefetchedQuestion) {
      appendGeneratedThread(prefetchedQuestion);
      return;
    }

    setIsGeneratingQuestion(true);

    try {
      const nextQuestion = await fetchGeneratedQuestion({
        excludeQuestionIds: sessionQuestionIds,
        requestToken,
        selectionStrategy,
      });

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
    if (!activeThread || isMarkingAnswer || isSkippingQuestion) {
      return;
    }

    const trimmedAnswer = answerDraft.trim();

    if (!trimmedAnswer) {
      logPracticeMarkingEvent("submit_blocked_empty_answer", {
        generatedQuestionId: Number(activeThread.question.questionId),
        threadId: activeThread.threadId,
      });
      setAnswerError("Answer text is required.");

      if (activeThread) {
        setStuckPromptState((current) => ({
          ...current,
          [activeThread.threadId]: true,
        }));
      }

      return;
    }

    const submittedThreadId = activeThread.threadId;
    const submittedAttemptNumber = getNextAttemptNumber(activeThread);
    const submittedAnswer = trimmedAnswer;
    const generatedQuestionId = Number(activeThread.question.questionId);
    const isStuckAnswer = isStuckPracticeAnswer(trimmedAnswer);
    const requestToken = sessionRequestTokenRef.current;
    const requestPayload = {
      generatedQuestionId,
      answerText: submittedAnswer,
      attemptNumber: submittedAttemptNumber,
    };

    logPracticeMarkingEvent("submit_start", {
      answerChars: submittedAnswer.length,
      answerText: submittedAnswer,
      attemptNumber: submittedAttemptNumber,
      generatedQuestionId,
      isStuckAnswer,
      threadId: submittedThreadId,
    });

    setAnswerError(null);
    setGenerationError(null);
    setIsMarkingAnswer(true);
    setAnswerReviewElapsedMs(0);
    setPendingAnswerReview({
      threadId: submittedThreadId,
      attemptNumber: submittedAttemptNumber,
      submittedAnswer,
    });
    setAnswerReviewStartedAt(Date.now());

    try {
      logPracticeMarkingEvent("route_request", {
        answerChars: submittedAnswer.length,
        answerText: submittedAnswer,
        attemptNumber: submittedAttemptNumber,
        generatedQuestionId,
        isStuckAnswer,
        markingMode: "points",
        method: "POST",
        threadId: submittedThreadId,
        url: "/api/mark-answer",
      });
      const response = await fetch("/api/mark-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      const body = await readResponseBody(response);

      if (requestToken !== sessionRequestTokenRef.current) {
        return;
      }

      logPracticeMarkingEvent("route_response", {
        attemptNumber: submittedAttemptNumber,
        generatedQuestionId,
        ok: response.ok,
        ...getMarkAnswerResponseLogSummary(body),
        reviewSource: isMarkAnswerResponse(body) ? body.reviewSource : null,
        score: isMarkAnswerResponse(body) ? body.score : null,
        status: response.status,
        threadId: submittedThreadId,
        url: "/api/mark-answer",
      });

      setPendingAnswerReview(null);
      setAnswerReviewStartedAt(null);

      if (!response.ok) {
        logPracticeMarkingEvent("route_error_response", {
          attemptNumber: submittedAttemptNumber,
          error: getApiErrorMessage(body, "Could not review this answer right now."),
          generatedQuestionId,
          status: response.status,
          threadId: submittedThreadId,
        });
        setAnswerError(
          getApiErrorMessage(body, "Could not review this answer right now."),
        );
        return;
      }

      if (!isMarkAnswerResponse(body)) {
        logPracticeMarkingEvent("route_invalid_response_shape", {
          attemptNumber: submittedAttemptNumber,
          generatedQuestionId,
          status: response.status,
          threadId: submittedThreadId,
        });
        setAnswerError("Could not review this answer right now.");
        return;
      }

      if (body.reviewSource !== "ai_review") {
        warnPracticeMarkingEvent("non_ai_review_received", {
          fallbackReason:
            body.reviewSource === "fallback_review"
              ? body.fallbackReason
              : null,
          attemptNumber: submittedAttemptNumber,
          generatedQuestionId,
          reviewSource: body.reviewSource,
          status: response.status,
          threadId: submittedThreadId,
        });
      }

      const nextAttempt: PracticeAttempt = {
        attemptNumber: submittedAttemptNumber,
        answer: submittedAnswer,
        feedback: body,
        isFeedbackCollapsed: false,
      };

      const completed = hasReachedPracticeCompletionThreshold(
        body.score,
        body.maxScore,
      );
      beginAttemptReveal(submittedThreadId, submittedAttemptNumber);
      setStuckPromptState((current) => ({
        ...current,
        [submittedThreadId]: isStuckPracticeAnswer(submittedAnswer),
      }));

      if (
        !sessionThreadsRef.current.some(
          (thread) => thread.threadId === submittedThreadId,
        )
      ) {
        warnPracticeMarkingEvent("route_response_thread_missing", {
          attemptNumber: submittedAttemptNumber,
          generatedQuestionId,
          threadId: submittedThreadId,
        });
        return;
      }

      setSessionThreads((current) =>
        updateThreadById(current, submittedThreadId, (thread) => ({
          ...thread,
          attempts: [
            ...thread.attempts.map((attempt) => ({
              ...attempt,
              isFeedbackCollapsed: true,
            })),
            nextAttempt,
          ],
          stage: completed ? "complete" : "improving",
          isCollapsed: completed ? true : thread.isCollapsed,
        })).threads,
      );

      if (!completed) {
        setComposerFocusSequence((current) => current + 1);
        return;
      }

      setAnswerDraft("");

      const nextCompletedQuestionCount = completedQuestionCount + 1;
      setCompletedQuestionCount(nextCompletedQuestionCount);
      await advanceToNextQuestion({
        requestToken,
        nextCompletedQuestionCount,
      });
    } catch {
      if (requestToken === sessionRequestTokenRef.current) {
        warnPracticeMarkingEvent("route_request_failed", {
          attemptNumber: submittedAttemptNumber,
          generatedQuestionId,
          threadId: submittedThreadId,
          url: "/api/mark-answer",
        });
        setPendingAnswerReview(null);
        setAnswerReviewStartedAt(null);
        setAnswerError("Could not review this answer right now.");
      }
    } finally {
      if (requestToken === sessionRequestTokenRef.current) {
        setIsMarkingAnswer(false);
        setPendingAnswerReview(null);
        setAnswerReviewStartedAt(null);
      }
    }
  }

  async function handleSkipQuestion() {
    if (!activeThread || isMarkingAnswer || isSkippingQuestion) {
      return;
    }

    const requestToken = sessionRequestTokenRef.current;

    setAnswerError(null);
    setGenerationError(null);
    setIsSkippingQuestion(true);

    try {
      const response = await fetch("/api/skip-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generatedQuestionId: Number(activeThread.question.questionId),
        }),
      });
      const body = await readResponseBody(response);

      if (requestToken !== sessionRequestTokenRef.current) {
        return;
      }

      if (!response.ok) {
        setAnswerError(
          getApiErrorMessage(body, "Could not skip this question right now."),
        );
        return;
      }

      setSessionThreads((current) =>
        updateActiveThread(current, (thread) => ({
          ...thread,
          stage: "skipped",
          isCollapsed: true,
        })),
      );
      setAnswerDraft("");
      await advanceToNextQuestion({
        requestToken,
        nextCompletedQuestionCount: completedQuestionCount,
      });
    } catch {
      if (requestToken === sessionRequestTokenRef.current) {
        setAnswerError("Could not skip this question right now.");
      }
    } finally {
      if (requestToken === sessionRequestTokenRef.current) {
        setIsSkippingQuestion(false);
      }
    }
  }

  function toggleAttemptFeedbackCollapse(
    threadId: string,
    attemptNumber: number,
  ) {
    setSessionThreads((current) =>
      current.map((thread) =>
        thread.threadId === threadId
          ? {
              ...thread,
              attempts: thread.attempts.map((attempt) =>
                attempt.attemptNumber === attemptNumber
                  ? {
                      ...attempt,
                      isFeedbackCollapsed: !attempt.isFeedbackCollapsed,
                    }
                  : attempt,
              ),
            }
          : thread,
      ),
    );
  }

  function toggleArchivedThread(threadId: string) {
    setSessionThreads((current) =>
      current.map((thread) =>
        thread.threadId === threadId &&
        (thread.stage === "complete" || thread.stage === "skipped")
          ? { ...thread, isCollapsed: !thread.isCollapsed }
          : thread,
      ),
    );
  }

  if (isPhoneLayout) {
    return (
      <section className="relative flex min-h-full min-w-0 bg-slate-50 dark:bg-slate-950">
        <div className="flex min-h-full min-w-0 flex-1 flex-col">
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
            ref={centerScrollContainerRef}
          >
            <header className="shrink-0 px-4 pb-4 pt-5">
              <div className="mx-auto flex w-full max-w-[720px] flex-col items-center text-center">
                <h1 className="text-[1.65rem] font-semibold tracking-tight text-slate-950 dark:text-white">
                  Practice questions
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  One question, one draft, one next improvement at a time.
                </p>
                <p className="mt-4 flex max-w-full items-center justify-center gap-2 overflow-hidden whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Link
                    className="truncate transition hover:text-sky-700 dark:hover:text-sky-200"
                    href={`/subjects/${subjectSlug}`}
                    prefetch
                  >
                    {subjectName}
                  </Link>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                    /
                  </span>
                  <span aria-current="page" className="truncate">
                    Practice questions
                  </span>
                </p>
              </div>
            </header>

            <div className="sticky top-0 z-20 border-y border-slate-200/80 bg-white/92 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/92">
              <div className="mx-auto flex w-full max-w-[720px] gap-2 px-4 py-3">
                <button
                  className={`${secondaryButtonClass} flex-1`}
                  onClick={onOpenSidebar}
                  type="button"
                >
                  Topics
                </button>
                <button
                  className={`${secondaryButtonClass} flex-1`}
                  onClick={onOpenSessionPanel}
                  type="button"
                >
                  Settings
                </button>
              </div>
            </div>

            <div
              className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-4"
              style={{
                paddingBottom: shouldShowPhoneStickyActionBar
                  ? PHONE_STICKY_BAR_CLEARANCE
                  : undefined,
              }}
            >
              {sessionThreads.length === 0 ? (
                <PracticeWorkspaceReadyState
                  canGenerate={canGenerateQuestion}
                  hasSelectedTopics={hasSelectedTopics}
                  isGeneratingQuestion={isGeneratingQuestion}
                  isPhoneLayout
                  onGenerateQuestion={handleGenerateQuestion}
                  selectedSubtopics={selectedSubtopics}
                />
              ) : (
                <>
                  {activeThread && activeThreadNumber !== null ? (
                    <ActivePracticeThread
                      answerDraft={answerDraft}
                      answerError={answerError}
                      attemptRevealState={attemptRevealState}
                      answerReviewTimerLabel={answerReviewTimerLabel}
                      composerFocusTrigger={composerFocusSequence}
                      hintRevealCount={hintRevealState[activeThread.threadId] ?? 0}
                      isMarkingAnswer={isMarkingAnswer}
                      isPhoneLayout
                      isSkippingQuestion={isSkippingQuestion}
                      key={activeThread.threadId}
                      onAnswerDraftChange={handleAnswerDraftChange}
                      onRevealNextHint={() => revealNextHint(activeThread.threadId)}
                      onSkipQuestion={handleSkipQuestion}
                      onSubmitAnswer={handleSubmitAnswer}
                      onToggleAttemptFeedbackCollapse={(attemptNumber) =>
                        toggleAttemptFeedbackCollapse(
                          activeThread.threadId,
                          attemptNumber,
                        )
                      }
                      pendingAnswerReview={pendingAnswerReview}
                      pendingReviewProgressMessage={pendingReviewProgressMessage}
                      shouldOfferHint={
                        stuckPromptState[activeThread.threadId] ?? false
                      }
                      thread={activeThread}
                      threadNumber={activeThreadNumber}
                    />
                  ) : null}

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

                  {archivedThreads.length > 0 ? (
                    <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <button
                        aria-expanded={isPhoneHistoryExpanded}
                        className="flex w-full items-center justify-between gap-3 text-left"
                        onClick={() =>
                          setIsPhoneHistoryExpanded((current) => !current)
                        }
                        type="button"
                      >
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Session history
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Review completed and skipped questions without
                            interrupting the current flow.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                            {archivedThreads.length}
                          </span>
                          <ThreadDisclosureIcon
                            className={`h-4 w-4 text-slate-500 transition-transform duration-300 ease-out motion-reduce:transition-none dark:text-slate-400 ${
                              isPhoneHistoryExpanded ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                        </div>
                      </button>

                      {isPhoneHistoryExpanded ? (
                        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                          {archivedThreads.map((thread) => (
                            <ArchivedPracticeThread
                              attemptRevealState={attemptRevealState}
                              key={thread.threadId}
                              onToggleAttemptFeedbackCollapse={(attemptNumber) =>
                                toggleAttemptFeedbackCollapse(
                                  thread.threadId,
                                  attemptNumber,
                                )
                              }
                              onToggleCollapse={() =>
                                toggleArchivedThread(thread.threadId)
                              }
                              thread={thread}
                              threadNumber={getThreadNumber(
                                sessionThreads,
                                thread.threadId,
                              )}
                            />
                          ))}
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        {shouldShowPhoneStickyActionBar && activeThread ? (
          <PhoneStickyActionBar
            isSkippingQuestion={isSkippingQuestion}
            keyboardOffset={mobileActionBarOffset}
            onSkipQuestion={handleSkipQuestion}
            onSubmitAnswer={handleSubmitAnswer}
            submitDisabled={
              isMarkingAnswer || isSkippingQuestion || answerDraft.trim().length === 0
            }
            submitLabel={
              isMarkingAnswer
                ? "Reviewing answer"
                : activeThread.attempts.length > 0
                  ? `Submit attempt ${getNextAttemptNumber(activeThread)}`
                  : "Submit answer"
            }
          />
        ) : null}

        <MobileSessionDrawer
          isOpen={isSessionPanelOpen}
          isPhoneLayout
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
            presentation="sheet"
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

  return (
    <section className="relative flex min-h-full min-w-0 bg-slate-50 dark:bg-slate-950 xl:h-full xl:min-h-0 xl:overflow-hidden">
      <div
        className={`grid min-h-full min-w-0 flex-1 ${desktopLayoutClass} xl:h-full xl:min-h-0`}
      >
        <div className="flex min-h-0 min-w-0 flex-col bg-slate-50 dark:bg-slate-950">
          <div
            className="flex min-h-0 min-w-0 flex-1 flex-col xl:overflow-y-auto"
            ref={centerScrollContainerRef}
          >
            <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-5 xl:px-6">
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
                    Choose a subtopic, generate a question, answer it, and improve
                    the next draft with feedback.
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
                      } ready`
                    : "Choose subtopics to start"}
                </InlineStatusPill>
                <InlineStatusPill>{sessionProgressLabel}</InlineStatusPill>
              </div>
            </header>

            <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-4 py-4 sm:px-5 xl:px-6">
              {hasSelectedTopics ? (
                <PracticeSelectionSummary selectedSubtopics={selectedSubtopics} />
              ) : null}

              {sessionThreads.length === 0 ? (
                <PracticeWorkspaceReadyState
                  canGenerate={canGenerateQuestion}
                  hasSelectedTopics={hasSelectedTopics}
                  isGeneratingQuestion={isGeneratingQuestion}
                  onGenerateQuestion={handleGenerateQuestion}
                  selectedSubtopics={selectedSubtopics}
                />
              ) : (
                <div className="space-y-6 pb-4 sm:space-y-7 sm:pb-6">
                  {sessionThreads.map((thread, index) =>
                    thread.stage === "complete" || thread.stage === "skipped" ? (
                      <ArchivedPracticeThread
                        attemptRevealState={attemptRevealState}
                        key={thread.threadId}
                        onToggleAttemptFeedbackCollapse={(attemptNumber) =>
                          toggleAttemptFeedbackCollapse(
                            thread.threadId,
                            attemptNumber,
                          )
                        }
                        onToggleCollapse={() => toggleArchivedThread(thread.threadId)}
                        thread={thread}
                        threadNumber={index + 1}
                      />
                    ) : (
                      <ActivePracticeThread
                        answerDraft={answerDraft}
                        answerError={answerError}
                        attemptRevealState={attemptRevealState}
                        answerReviewTimerLabel={answerReviewTimerLabel}
                        composerFocusTrigger={composerFocusSequence}
                        hintRevealCount={hintRevealState[thread.threadId] ?? 0}
                        isMarkingAnswer={isMarkingAnswer}
                        isPhoneLayout={false}
                        isSkippingQuestion={isSkippingQuestion}
                        key={thread.threadId}
                        onAnswerDraftChange={handleAnswerDraftChange}
                        onRevealNextHint={() => revealNextHint(thread.threadId)}
                        onSkipQuestion={handleSkipQuestion}
                        onSubmitAnswer={handleSubmitAnswer}
                        onToggleAttemptFeedbackCollapse={(attemptNumber) =>
                          toggleAttemptFeedbackCollapse(
                            thread.threadId,
                            attemptNumber,
                          )
                        }
                        pendingAnswerReview={pendingAnswerReview}
                        pendingReviewProgressMessage={pendingReviewProgressMessage}
                        shouldOfferHint={stuckPromptState[thread.threadId] ?? false}
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

        <div className="hidden xl:block xl:min-h-0">
          <div className="relative h-full overflow-hidden">
            <div
              aria-hidden={!isDesktopSessionPanelCollapsed}
              className="absolute inset-y-0 right-0 z-0 w-[3.75rem]"
              inert={!isDesktopSessionPanelCollapsed}
            >
              <DesktopSessionRail
                onExpand={() => setIsDesktopSessionPanelCollapsed(false)}
              />
            </div>

            <div
              aria-hidden={isDesktopSessionPanelCollapsed}
              className={`absolute inset-y-0 right-0 z-10 w-[320px] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${
                isDesktopSessionPanelCollapsed
                  ? "translate-x-full pointer-events-none"
                  : "translate-x-0"
              }`}
              inert={isDesktopSessionPanelCollapsed}
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
            </div>
          </div>
        </div>
      </div>

      <MobileSessionDrawer
        isOpen={isSessionPanelOpen}
        isPhoneLayout={false}
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

function PracticeSelectionSummary({
  selectedSubtopics,
}: {
  selectedSubtopics: WorkspaceSelectedSubtopic[];
}) {
  const visibleSubtopics = selectedSubtopics.slice(0, 6);
  const remainingSubtopicCount = Math.max(
    selectedSubtopics.length - visibleSubtopics.length,
    0,
  );
  const firstSelectedSubtopic = selectedSubtopics[0];
  const title =
    selectedSubtopics.length === 1
      ? `Ready to practice ${firstSelectedSubtopic?.name ?? "this subtopic"}`
      : `${selectedSubtopics.length} subtopics selected`;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
            Session scope
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            The next generated question will stay inside the selected syllabus
            areas until you change the selection.
          </p>
        </div>

        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          {selectedSubtopics.length} selected
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {visibleSubtopics.map((subtopic) => (
          <span
            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            key={subtopic.id}
            title={`${subtopic.moduleLabel} / ${subtopic.topicName} / ${subtopic.name}`}
          >
            {subtopic.name}
          </span>
        ))}
        {remainingSubtopicCount > 0 ? (
          <span className="inline-flex rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            +{remainingSubtopicCount} more
          </span>
        ) : null}
      </div>
    </section>
  );
}

type PracticeWorkspaceReadyStateProps = {
  hasSelectedTopics: boolean;
  canGenerate: boolean;
  isGeneratingQuestion: boolean;
  isPhoneLayout?: boolean;
  selectedSubtopics: WorkspaceSelectedSubtopic[];
  onGenerateQuestion: () => void;
};

function PracticeWorkspaceReadyState({
  hasSelectedTopics,
  canGenerate,
  isGeneratingQuestion,
  isPhoneLayout = false,
  selectedSubtopics,
  onGenerateQuestion,
}: PracticeWorkspaceReadyStateProps) {
  const selectedTopicCount = selectedSubtopics.length;
  const selectedTopicLabel =
    selectedTopicCount === 1
      ? selectedSubtopics[0]?.name ?? "your selected subtopic"
      : `${selectedTopicCount} selected subtopics`;

  return (
    <section className="flex min-h-[360px] flex-1 items-center">
      <div className="w-full rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
          Next step
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {hasSelectedTopics
            ? "Generate your first question."
            : "Choose a syllabus area to get started."}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          {hasSelectedTopics
            ? `${selectedTopicLabel} ${
                selectedTopicCount === 1 ? "is" : "are"
              } ready. Generate a question to start the answer-and-improve flow.`
            : isPhoneLayout
              ? "Use Topics above to choose modules, topics, or subtopics first, then come back here to generate a question."
              : "Use the syllabus rail to choose modules, topics, or subtopics first, then come back here to generate a question."}
        </p>

        {hasSelectedTopics ? (
          <div className="mt-6 flex justify-center">
            <button
              className={primaryButtonClass}
              disabled={!canGenerate}
              onClick={onGenerateQuestion}
              type="button"
            >
              {isGeneratingQuestion ? "Generating..." : "Generate your first question"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type ActivePracticeThreadProps = {
  thread: SessionThread;
  threadNumber: number;
  answerDraft: string;
  answerError: string | null;
  attemptRevealState: AttemptRevealStateMap;
  answerReviewTimerLabel: string | null;
  composerFocusTrigger: number;
  hintRevealCount: number;
  isMarkingAnswer: boolean;
  isPhoneLayout: boolean;
  isSkippingQuestion: boolean;
  onAnswerDraftChange: (value: string) => void;
  onRevealNextHint: () => void;
  onSkipQuestion: () => void;
  onSubmitAnswer: () => void;
  onToggleAttemptFeedbackCollapse: (attemptNumber: number) => void;
  pendingAnswerReview: PendingAnswerReview | null;
  pendingReviewProgressMessage: string | null;
  shouldOfferHint: boolean;
};

function ActivePracticeThread({
  thread,
  threadNumber,
  answerDraft,
  answerError,
  attemptRevealState,
  answerReviewTimerLabel,
  composerFocusTrigger,
  hintRevealCount,
  isMarkingAnswer,
  isPhoneLayout,
  isSkippingQuestion,
  onAnswerDraftChange,
  onRevealNextHint,
  onSkipQuestion,
  onSubmitAnswer,
  onToggleAttemptFeedbackCollapse,
  pendingAnswerReview,
  pendingReviewProgressMessage,
  shouldOfferHint,
}: ActivePracticeThreadProps) {
  const composerRegionRef = useRef<HTMLDivElement>(null);
  const latestAttempt = getLatestAttempt(thread);
  const isImproving =
    thread.stage === "improving" || thread.stage === "feedback";
  const shouldShowComposer =
    thread.stage === "question" ||
    thread.stage === "improving" ||
    thread.stage === "feedback";
  const nextAttemptNumber = getNextAttemptNumber(thread);
  const submitAriaLabel = isMarkingAnswer
    ? "Reviewing answer"
    : thread.attempts.length > 0
      ? `Submit attempt ${nextAttemptNumber}`
      : "Submit answer";
  const practiceHints = useMemo(
    () =>
      derivePracticeHints({
        questionText: thread.question.questionText,
        answerFocus: thread.question.answerFocus,
        rubricPoints: thread.question.rubricPoints,
        modelAnswer: thread.question.modelAnswer,
        maxScore: thread.question.marks,
      }),
    [thread.question],
  );
  const revealedHints = practiceHints.slice(
    0,
    Math.min(hintRevealCount, MAX_PRACTICE_HINT_LEVEL),
  );
  const latestReviewState = useMemo(
    () =>
      latestAttempt
        ? derivePracticeReviewState({
            rubricAssessment: latestAttempt.feedback.rubricAssessment,
            score: latestAttempt.feedback.score,
            maxScore: latestAttempt.feedback.maxScore,
          })
        : null,
    [latestAttempt],
  );
  const hintButtonLabel =
    hintRevealCount >= MAX_PRACTICE_HINT_LEVEL
      ? "All hints revealed"
      : hintRevealCount === 0
        ? "Need a hint?"
        : "Show next hint";
  const nextHintLabel =
    hintRevealCount === 0
      ? "Need help starting?"
      : hintRevealCount === 1
        ? "Show more help"
        : hintRevealCount === 2
          ? "Show example sentence"
          : null;
  const skipActionLabel = isSkippingQuestion ? "Skipping..." : "skip";
  const skipActionAriaLabel = isSkippingQuestion ? "Skipping question" : "Skip question";
  const activePendingAnswerReview =
    pendingAnswerReview?.threadId === thread.threadId ? pendingAnswerReview : null;

  useEffect(() => {
    if (!shouldShowComposer || composerFocusTrigger === 0) {
      return;
    }

    const composerRegion = composerRegionRef.current;

    if (!composerRegion) {
      return;
    }

    composerRegion.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [composerFocusTrigger, shouldShowComposer]);

  if (isPhoneLayout) {
    return (
      <PhoneActivePracticeThreadView
        activePendingAnswerReview={activePendingAnswerReview}
        answerDraft={answerDraft}
        answerError={answerError}
        answerReviewTimerLabel={answerReviewTimerLabel}
        attemptRevealState={attemptRevealState}
        composerFocusTrigger={composerFocusTrigger}
        composerRegionRef={composerRegionRef}
        isMarkingAnswer={isMarkingAnswer}
        isSkippingQuestion={isSkippingQuestion}
        latestAttempt={latestAttempt}
        latestReviewState={latestReviewState}
        nextHintLabel={nextHintLabel}
        onAnswerDraftChange={onAnswerDraftChange}
        onRevealNextHint={onRevealNextHint}
        onSkipQuestion={onSkipQuestion}
        onSubmitAnswer={onSubmitAnswer}
        onToggleAttemptFeedbackCollapse={onToggleAttemptFeedbackCollapse}
        pendingReviewProgressMessage={pendingReviewProgressMessage}
        practiceHints={practiceHints}
        revealedHints={revealedHints}
        shouldOfferHint={shouldOfferHint}
        shouldShowComposer={shouldShowComposer}
        skipActionAriaLabel={skipActionAriaLabel}
        skipActionLabel={skipActionLabel}
        submitAriaLabel={submitAriaLabel}
        thread={thread}
        threadNumber={threadNumber}
      />
    );
  }

  return (
    <article className="space-y-5 rounded-[30px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:py-5">
      <QuestionThreadHeader
        hintButtonLabel={hintButtonLabel}
        isHintButtonDisabled={hintRevealCount >= MAX_PRACTICE_HINT_LEVEL}
        isCondensed={thread.attempts.length > 0 || isImproving}
        isPhoneLayout={false}
        onRevealNextHint={onRevealNextHint}
        question={thread.question}
        threadNumber={threadNumber}
      />

      {thread.attempts.length > 0 ? (
        <div className="space-y-4">
          {thread.attempts.map((attempt) => (
            <ThreadTurn
              attempt={attempt}
              isGuidancePrimary={
                attempt.attemptNumber === latestAttempt?.attemptNumber &&
                isImproving
              }
              key={attempt.attemptNumber}
              modelAnswer={thread.question.modelAnswer}
              onToggleFeedbackCollapse={() =>
                onToggleAttemptFeedbackCollapse(attempt.attemptNumber)
              }
              revealStage={getAttemptRevealStage(
                attemptRevealState,
                thread.threadId,
                attempt.attemptNumber,
              )}
            />
          ))}
        </div>
      ) : null}

      {activePendingAnswerReview && pendingReviewProgressMessage ? (
        <PendingReviewTurn
          attemptNumber={activePendingAnswerReview.attemptNumber}
          progressMessage={pendingReviewProgressMessage}
          submittedAnswer={activePendingAnswerReview.submittedAnswer}
        />
      ) : null}

      {shouldShowComposer ? (
        <div
          className="space-y-2.5 border-t border-slate-200/80 pt-4 dark:border-slate-800/80"
          ref={composerRegionRef}
        >
          {answerError ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              {answerError}
            </div>
          ) : null}

          {latestReviewState &&
          (latestReviewState.revealedMissing.length > 0 ||
            latestReviewState.nextDraftTarget) ? (
            <RewriteAidCard
              items={latestReviewState.revealedMissing}
              nextDraftTarget={latestReviewState.nextDraftTarget}
            />
          ) : null}

          {revealedHints.length > 0 ||
          (shouldOfferHint && hintRevealCount < MAX_PRACTICE_HINT_LEVEL) ? (
            <PracticeHintPanel
              hints={revealedHints}
              shouldOfferHint={
                shouldOfferHint && hintRevealCount < MAX_PRACTICE_HINT_LEVEL
              }
            />
          ) : null}

          <PracticeInputBar
            footerNote={answerReviewTimerLabel}
            focusTrigger={composerFocusTrigger}
            isRewriteEmphasized={shouldShowComposer}
            onSecondaryAction={onSkipQuestion}
            onSubmit={onSubmitAnswer}
            onValueChange={onAnswerDraftChange}
            secondaryActionAriaLabel={skipActionAriaLabel}
            secondaryActionDisabled={isMarkingAnswer || isSkippingQuestion}
            secondaryActionLabel={skipActionLabel}
            submitDisabled={
              isMarkingAnswer || isSkippingQuestion || answerDraft.trim().length === 0
            }
            submitAriaLabel={submitAriaLabel}
            value={answerDraft}
          />
        </div>
      ) : null}
    </article>
  );
}

type PhoneActivePracticeThreadViewProps = {
  thread: SessionThread;
  threadNumber: number;
  answerDraft: string;
  answerError: string | null;
  answerReviewTimerLabel: string | null;
  attemptRevealState: AttemptRevealStateMap;
  composerFocusTrigger: number;
  composerRegionRef: RefObject<HTMLDivElement | null>;
  isMarkingAnswer: boolean;
  isSkippingQuestion: boolean;
  latestAttempt: PracticeAttempt | null;
  latestReviewState: PracticeReviewState | null;
  nextHintLabel: string | null;
  onAnswerDraftChange: (value: string) => void;
  onRevealNextHint: () => void;
  onSkipQuestion: () => void;
  onSubmitAnswer: () => void;
  onToggleAttemptFeedbackCollapse: (attemptNumber: number) => void;
  pendingReviewProgressMessage: string | null;
  practiceHints: PracticeHintLevel[];
  revealedHints: PracticeHintLevel[];
  shouldOfferHint: boolean;
  shouldShowComposer: boolean;
  skipActionAriaLabel: string;
  skipActionLabel: string;
  submitAriaLabel: string;
  activePendingAnswerReview: PendingAnswerReview | null;
};

function PhoneActivePracticeThreadView({
  thread,
  threadNumber,
  answerDraft,
  answerError,
  answerReviewTimerLabel,
  attemptRevealState,
  composerFocusTrigger,
  composerRegionRef,
  isMarkingAnswer,
  isSkippingQuestion,
  latestAttempt,
  latestReviewState,
  nextHintLabel,
  onAnswerDraftChange,
  onRevealNextHint,
  onSkipQuestion,
  onSubmitAnswer,
  onToggleAttemptFeedbackCollapse,
  pendingReviewProgressMessage,
  practiceHints,
  revealedHints,
  shouldOfferHint,
  shouldShowComposer,
  skipActionAriaLabel,
  skipActionLabel,
  submitAriaLabel,
  activePendingAnswerReview,
}: PhoneActivePracticeThreadViewProps) {
  const [isEarlierDraftsVisible, setIsEarlierDraftsVisible] = useState(false);
  const currentAttemptRevealStage = latestAttempt
    ? getAttemptRevealStage(
        attemptRevealState,
        thread.threadId,
        latestAttempt.attemptNumber,
      )
    : "focused";
  const earlierAttempts = activePendingAnswerReview
    ? thread.attempts
    : thread.attempts.slice(0, -1);
  const canRevealMoreHints =
    revealedHints.length < practiceHints.length && nextHintLabel !== null;

  return (
    <article className="space-y-4 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <QuestionThreadHeader
        isCondensed={thread.attempts.length > 0}
        isPhoneLayout
        question={thread.question}
        threadNumber={threadNumber}
      />

      {shouldShowComposer ? (
        <div className="space-y-3" ref={composerRegionRef}>
          {answerError ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              {answerError}
            </div>
          ) : null}

          <PracticeInputBar
            footerNote={answerReviewTimerLabel}
            focusTrigger={composerFocusTrigger}
            isRewriteEmphasized={shouldShowComposer}
            layout="phone"
            onSecondaryAction={onSkipQuestion}
            onSubmit={onSubmitAnswer}
            onValueChange={onAnswerDraftChange}
            secondaryActionAriaLabel={skipActionAriaLabel}
            secondaryActionDisabled={isMarkingAnswer || isSkippingQuestion}
            secondaryActionLabel={skipActionLabel}
            showInlineActions={false}
            submitDisabled={
              isMarkingAnswer || isSkippingQuestion || answerDraft.trim().length === 0
            }
            submitAriaLabel={submitAriaLabel}
            value={answerDraft}
          />
        </div>
      ) : null}

      <PhonePracticeHintPanel
        canRevealMoreHints={canRevealMoreHints}
        hints={revealedHints}
        nextHintLabel={nextHintLabel}
        onRevealNextHint={onRevealNextHint}
        shouldOfferHint={shouldOfferHint}
      />

      {activePendingAnswerReview && pendingReviewProgressMessage ? (
        <PhonePendingReviewCard
          attemptNumber={activePendingAnswerReview.attemptNumber}
          progressMessage={pendingReviewProgressMessage}
        />
      ) : latestAttempt && latestReviewState ? (
        <PhoneCurrentReviewCard
          attempt={latestAttempt}
          nextDraftTarget={latestReviewState.nextDraftTarget}
          priorityMissingItems={latestReviewState.revealedMissing}
          revealStage={currentAttemptRevealStage}
          thread={thread}
        />
      ) : null}

      {earlierAttempts.length > 0 ? (
        <section className="rounded-[22px] border border-slate-200 bg-slate-50/85 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/65">
          <button
            aria-expanded={isEarlierDraftsVisible}
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setIsEarlierDraftsVisible((current) => !current)}
            type="button"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Earlier drafts
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Reopen earlier attempts and feedback only when you need them.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {earlierAttempts.length}
              </span>
              <ThreadDisclosureIcon
                className={`h-4 w-4 text-slate-500 transition-transform duration-300 ease-out motion-reduce:transition-none dark:text-slate-400 ${
                  isEarlierDraftsVisible ? "rotate-0" : "-rotate-90"
                }`}
              />
            </div>
          </button>

          {isEarlierDraftsVisible ? (
            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              {earlierAttempts.map((attempt) => (
                <ThreadTurn
                  attempt={attempt}
                  key={attempt.attemptNumber}
                  modelAnswer={thread.question.modelAnswer}
                  onToggleFeedbackCollapse={() =>
                    onToggleAttemptFeedbackCollapse(attempt.attemptNumber)
                  }
                  revealStage={getAttemptRevealStage(
                    attemptRevealState,
                    thread.threadId,
                    attempt.attemptNumber,
                  )}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {latestReviewState &&
      (latestReviewState.revealedMissing.length > 0 ||
        latestReviewState.nextDraftTarget) ? (
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          Keep rewriting in the same answer box above while the priority gaps stay
          visible below.
        </p>
      ) : null}
    </article>
  );
}

function PhonePracticeHintPanel({
  hints,
  shouldOfferHint,
  canRevealMoreHints,
  nextHintLabel,
  onRevealNextHint,
}: {
  hints: PracticeHintLevel[];
  shouldOfferHint: boolean;
  canRevealMoreHints: boolean;
  nextHintLabel: string | null;
  onRevealNextHint: () => void;
}) {
  return (
    <section
      className={`rounded-[22px] border px-4 py-4 ${
        shouldOfferHint
          ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
          : "border-slate-200 bg-slate-50/85 dark:border-slate-800 dark:bg-slate-950/65"
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                shouldOfferHint
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Hint support
            </p>
            <p
              className={`mt-1 text-sm leading-6 ${
                shouldOfferHint
                  ? "text-amber-900 dark:text-amber-100"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {shouldOfferHint
                ? "Looks like you might be stuck. Reveal the next hint, then keep typing in the same answer box."
                : "Reveal a structured hint only when you need a nudge."}
            </p>
          </div>

          {canRevealMoreHints && nextHintLabel ? (
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200"
              onClick={onRevealNextHint}
              type="button"
            >
              {nextHintLabel}
            </button>
          ) : (
            <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              All hints shown
            </span>
          )}
        </div>

        {hints.length > 0 ? (
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {hints.map((hint) => (
              <HintCard hint={hint} key={hint.level} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PhonePendingReviewCard({
  attemptNumber,
  progressMessage,
}: {
  attemptNumber: number;
  progressMessage: string;
}) {
  return (
    <section className="space-y-4 rounded-[24px] border border-sky-200 bg-white px-4 py-4 shadow-sm dark:border-sky-500/30 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
            AI review
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Attempt {attemptNumber} is being checked now.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"
          />
          In progress
        </span>
      </div>

      <section className="review-shimmer rounded-[22px] border border-sky-200 bg-white/90 px-4 py-4 shadow-sm dark:border-sky-500/30 dark:bg-slate-900/85">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
          AI review in progress
        </p>
        <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {progressMessage}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your score will appear first, followed by priority missing points and
          the next draft target.
        </p>
      </section>

      <ReviewRevealPlaceholder
        description="Checking priority missing points..."
        minHeightClass="min-h-[108px]"
        title="Priority missing points"
      />
      <ReviewRevealPlaceholder
        description="Preparing next draft target..."
        minHeightClass="min-h-[96px]"
        title="Next draft target"
      />
    </section>
  );
}

function PhoneCurrentReviewCard({
  attempt,
  thread,
  priorityMissingItems,
  nextDraftTarget,
  revealStage = "focused",
}: {
  attempt: PracticeAttempt;
  thread: SessionThread;
  priorityMissingItems: RubricAssessmentItem[];
  nextDraftTarget: string | null;
  revealStage?: AttemptRevealStage;
}) {
  const [isFullReviewVisible, setIsFullReviewVisible] = useState(false);
  const [isModelAnswerVisible, setIsModelAnswerVisible] = useState(false);
  const reviewState = useMemo(
    () =>
      derivePracticeReviewState({
        rubricAssessment: attempt.feedback.rubricAssessment,
        score: attempt.feedback.score,
        maxScore: attempt.feedback.maxScore,
      }),
    [attempt.feedback],
  );
  const hasModelAnswer =
    typeof thread.question.modelAnswer === "string" &&
    thread.question.modelAnswer.trim().length > 0;
  const offTopicPoints = attempt.feedback.feedback.offTopicPoints ?? [];
  const hasSupplementaryReview =
    reviewState.present.length > 0 ||
    reviewState.partial.length > 0 ||
    reviewState.absent.length > priorityMissingItems.length ||
    offTopicPoints.length > 0 ||
    hasModelAnswer;
  const isFocusedFeedbackVisible = revealStage === "focused";

  return (
    <section className="space-y-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
            Latest feedback
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Attempt {attempt.attemptNumber} is marked. Keep editing your answer
            above and use this as the next target.
          </p>
        </div>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Score first
        </span>
      </div>

      <div className="space-y-4">
        <ReviewScoreSection feedback={attempt.feedback} isEmphasized />
        <ReviewSourceNotice feedback={attempt.feedback} />
        {isFocusedFeedbackVisible ? (
          <>
            <RubricAssessmentSection
              emptyMessage={
                reviewState.absent.length === 0
                  ? "No priority missing points right now."
                  : "No priority missing points revealed right now."
              }
              items={priorityMissingItems}
              status="absent"
              title="Priority missing points"
            />
            <NextDraftTargetSection
              isEmphasized
              nextStep={nextDraftTarget}
            />
          </>
        ) : (
          <>
            <ReviewRevealPlaceholder
              description="Preparing priority missing points..."
              isEmphasized
              minHeightClass="min-h-[108px]"
              title="Priority missing points"
            />
            <ReviewRevealPlaceholder
              description="Preparing next draft target..."
              isEmphasized
              minHeightClass="min-h-[96px]"
              title="Next draft target"
            />
          </>
        )}
      </div>

      {hasSupplementaryReview ? (
        <div className="flex">
          <button
            aria-expanded={isFullReviewVisible}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
            onClick={() => setIsFullReviewVisible((current) => !current)}
            type="button"
          >
            {isFullReviewVisible ? "Hide full review" : "Show full review"}
          </button>
        </div>
      ) : null}

      {isFullReviewVisible ? (
        <div className="space-y-5 rounded-[24px] border border-slate-200/80 bg-white/85 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80">
          <RubricAssessmentSection
            emptyMessage="No mark points matched."
            items={reviewState.present}
            status="present"
            title="Correct"
          />
          {reviewState.partial.length > 0 ? (
            <RubricAssessmentSection
              items={reviewState.partial}
              status="partial"
              title="Partial"
            />
          ) : null}
          <RubricAssessmentSection
            emptyMessage="No missing rubric points."
            items={reviewState.absent}
            status="absent"
            title="All missing points"
          />
          {offTopicPoints.length > 0 ? (
            <OffTopicContentSection offTopicPoints={offTopicPoints} />
          ) : null}
          {hasModelAnswer && thread.question.modelAnswer ? (
            <ModelAnswerSection
              isVisible={isModelAnswerVisible}
              modelAnswer={thread.question.modelAnswer}
              onToggle={() => setIsModelAnswerVisible((current) => !current)}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type ArchivedPracticeThreadProps = {
  thread: SessionThread;
  threadNumber: number;
  attemptRevealState: AttemptRevealStateMap;
  onToggleCollapse: () => void;
  onToggleAttemptFeedbackCollapse: (attemptNumber: number) => void;
};

function ArchivedPracticeThread({
  thread,
  threadNumber,
  attemptRevealState,
  onToggleCollapse,
  onToggleAttemptFeedbackCollapse,
}: ArchivedPracticeThreadProps) {
  const firstAttempt = thread.attempts[0] ?? null;
  const finalAttempt = thread.attempts[thread.attempts.length - 1] ?? null;
  const isCompletedThread = thread.stage === "complete";
  const improvementLabel =
    firstAttempt && finalAttempt
      ? getImprovementLabel(firstAttempt, finalAttempt)
      : null;
  const statusLabel = isCompletedThread ? "Completed" : "Skipped";
  const statusClassName = isCompletedThread
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";

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
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusClassName}`}
              >
                {statusLabel}
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
                className={`h-4 w-4 transition-transform duration-200 ease-out motion-reduce:transition-none ${
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
            {isCompletedThread ? "Final score:" : "Latest score:"}{" "}
            <span className="font-semibold text-slate-950 dark:text-white">
              {finalAttempt.feedback.score}/{finalAttempt.feedback.maxScore}
            </span>
          </span>
        ) : thread.stage === "skipped" ? (
          <span>Skipped before submitting an answer.</span>
        ) : null}
        <span>Attempts: {thread.attempts.length}</span>
        {improvementLabel ? <span>{improvementLabel}</span> : null}
      </div>

      <div
        aria-hidden={thread.isCollapsed}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
          thread.isCollapsed
            ? "grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`mt-5 space-y-5 border-t border-slate-200/80 pt-5 transition-transform duration-200 ease-out motion-reduce:transition-none dark:border-slate-800/80 ${
              thread.isCollapsed ? "-translate-y-2" : "translate-y-0"
            }`}
          >
            <QuestionThreadHeader
              isCondensed
              question={thread.question}
              threadNumber={threadNumber}
            />

            <div className="space-y-5">
              {thread.attempts.map((attempt) => (
                <ThreadTurn
                  attempt={attempt}
                  key={attempt.attemptNumber}
                  modelAnswer={thread.question.modelAnswer}
                  onToggleFeedbackCollapse={() =>
                    onToggleAttemptFeedbackCollapse(attempt.attemptNumber)
                  }
                  revealStage={getAttemptRevealStage(
                    attemptRevealState,
                    thread.threadId,
                    attempt.attemptNumber,
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

type QuestionThreadHeaderProps = {
  question: GenerateQuestionResponse;
  threadNumber: number;
  isCondensed: boolean;
  isPhoneLayout?: boolean;
  hintButtonLabel?: string;
  isHintButtonDisabled?: boolean;
  onRevealNextHint?: () => void;
};

function QuestionThreadHeader({
  question,
  threadNumber,
  isCondensed,
  isPhoneLayout = false,
  hintButtonLabel = "Need a hint?",
  isHintButtonDisabled = false,
  onRevealNextHint,
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
              isPhoneLayout
                ? isCondensed
                  ? "text-lg leading-8"
                  : "text-xl leading-8"
                : isCondensed
                ? "text-lg leading-8 sm:text-xl sm:leading-9"
                : "text-2xl leading-10 sm:text-[2rem] sm:leading-[1.45]"
            }`}
          >
            {question.questionText}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            {question.marks} marks
          </span>
          {onRevealNextHint ? (
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
              disabled={isHintButtonDisabled}
              onClick={onRevealNextHint}
              type="button"
            >
              {hintButtonLabel}
            </button>
          ) : null}
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

type ThreadTurnProps = {
  attempt: PracticeAttempt;
  isGuidancePrimary?: boolean;
  modelAnswer: string | null;
  onToggleFeedbackCollapse: () => void;
  revealStage?: AttemptRevealStage;
};

type RubricAssessmentItem = MarkAnswerResponse["rubricAssessment"][number];

function ThreadTurn({
  attempt,
  isGuidancePrimary = false,
  modelAnswer,
  onToggleFeedbackCollapse,
  revealStage = "focused",
}: ThreadTurnProps) {
  const [isModelAnswerVisible, setIsModelAnswerVisible] = useState(false);
  const [isFullReviewVisible, setIsFullReviewVisible] = useState(false);
  const feedbackPanelId = useId();
  const reviewState = useMemo(
    () =>
      derivePracticeReviewState({
        rubricAssessment: attempt.feedback.rubricAssessment,
        score: attempt.feedback.score,
        maxScore: attempt.feedback.maxScore,
      }),
    [attempt.feedback],
  );
  const hasModelAnswer =
    typeof modelAnswer === "string" && modelAnswer.trim().length > 0;
  const offTopicPoints = attempt.feedback.feedback.offTopicPoints ?? [];
  const feedbackToggleLabel = getReviewToggleLabel(
    attempt.feedback.reviewSource,
    attempt.isFeedbackCollapsed,
  );
  const isFocusedFeedbackVisible = revealStage === "focused";
  const hasSupplementaryReview =
    reviewState.present.length > 0 ||
    reviewState.partial.length > 0 ||
    reviewState.absent.length > reviewState.revealedMissing.length ||
    offTopicPoints.length > 0 ||
    hasModelAnswer;
  const fullReviewToggleLabel = isFullReviewVisible
    ? "Hide full review"
    : "Show full review";
  const reviewSourceLabel = getReviewSourceLabel(attempt.feedback.reviewSource);

  return (
    <div className="space-y-3.5">
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
        caption={`${reviewSourceLabel} - Attempt ${attempt.attemptNumber}`}
        headerTrailing={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {attempt.feedback.score}/{attempt.feedback.maxScore}
            </span>
            <button
              aria-controls={feedbackPanelId}
              aria-expanded={!attempt.isFeedbackCollapsed}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
              onClick={onToggleFeedbackCollapse}
              type="button"
            >
              {feedbackToggleLabel}
              <ThreadDisclosureIcon
                className={`h-3.5 w-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  attempt.isFeedbackCollapsed ? "-rotate-90" : "rotate-0"
                }`}
              />
            </button>
          </div>
        }
        tone="feedback"
      >
        <div className="space-y-3">
          {attempt.isFeedbackCollapsed ? (
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {getCollapsedReviewMessage(attempt.feedback.reviewSource)}
            </p>
          ) : null}

          <div
            aria-hidden={attempt.isFeedbackCollapsed}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
              attempt.isFeedbackCollapsed
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100"
            }`}
            id={feedbackPanelId}
          >
            <div className="overflow-hidden">
              <div
                className={`space-y-5 transition-transform duration-300 ease-out motion-reduce:transition-none ${
                  attempt.isFeedbackCollapsed ? "-translate-y-2" : "translate-y-0"
                }`}
              >
                <ReviewScoreSection
                  feedback={attempt.feedback}
                  isEmphasized={isGuidancePrimary}
                />
                <ReviewSourceNotice feedback={attempt.feedback} />
                {isFocusedFeedbackVisible ? (
                  <>
                    <RubricAssessmentSection
                      emptyMessage={
                        reviewState.absent.length === 0
                          ? "No priority missing points right now."
                          : "No priority missing points revealed right now."
                      }
                      items={reviewState.revealedMissing}
                      status="absent"
                      title="Priority missing points"
                    />
                    <NextDraftTargetSection
                      isEmphasized={isGuidancePrimary}
                      nextStep={reviewState.nextDraftTarget}
                    />
                    {hasSupplementaryReview ? (
                      <div className="flex">
                        <button
                          aria-expanded={isFullReviewVisible}
                          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
                          onClick={() =>
                            setIsFullReviewVisible((current) => !current)
                          }
                          type="button"
                        >
                          {fullReviewToggleLabel}
                        </button>
                      </div>
                    ) : null}
                    {isFullReviewVisible ? (
                      <div
                        className={`rounded-[24px] border border-slate-200/80 bg-white/85 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/80 ${
                          isGuidancePrimary ? "space-y-5 opacity-90" : "space-y-5"
                        }`}
                      >
                        <RubricAssessmentSection
                          emptyMessage="No mark points matched."
                          items={reviewState.present}
                          status="present"
                          title="Correct"
                        />
                        {reviewState.partial.length > 0 ? (
                          <RubricAssessmentSection
                            items={reviewState.partial}
                            status="partial"
                            title="Partial"
                          />
                        ) : null}
                        <RubricAssessmentSection
                          emptyMessage="No missing rubric points."
                          items={reviewState.absent}
                          status="absent"
                          title="All missing points"
                        />
                        {offTopicPoints.length > 0 ? (
                          <OffTopicContentSection offTopicPoints={offTopicPoints} />
                        ) : null}
                        {hasModelAnswer ? (
                          <ModelAnswerSection
                            isVisible={isModelAnswerVisible}
                            modelAnswer={modelAnswer}
                            onToggle={() =>
                              setIsModelAnswerVisible((current) => !current)
                            }
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <ReviewRevealPlaceholder
                      description="Preparing priority missing points..."
                      isEmphasized={isGuidancePrimary}
                      minHeightClass="min-h-[108px]"
                      title="Priority missing points"
                    />
                    <ReviewRevealPlaceholder
                      description="Preparing next draft target..."
                      isEmphasized={isGuidancePrimary}
                      minHeightClass="min-h-[96px]"
                      title="Next draft target"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </ThreadBlock>
    </div>
  );
}

function PendingReviewTurn({
  attemptNumber,
  progressMessage,
  submittedAnswer,
}: {
  attemptNumber: number;
  progressMessage: string;
  submittedAnswer: string;
}) {
  return (
    <div className="space-y-3.5">
      <ThreadBlock
        align="right"
        caption={`Your answer - Attempt ${attemptNumber}`}
        tone="answer"
      >
        <p className="whitespace-pre-wrap text-sm leading-7 text-inherit">
          {submittedAnswer}
        </p>
      </ThreadBlock>

      <ThreadBlock
        align="left"
        caption={`AI review - Attempt ${attemptNumber}`}
        headerTrailing={
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"
            />
            In progress
          </span>
        }
        tone="feedback"
      >
        <div aria-atomic="true" aria-live="polite" className="space-y-5">
          <section className="review-shimmer rounded-[22px] border border-sky-200 bg-white/90 px-4 py-4 shadow-sm dark:border-sky-500/30 dark:bg-slate-900/85">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
              AI review in progress
            </p>
            <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {progressMessage}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your score will appear first, followed by priority missing points
              and the next draft target.
            </p>
          </section>
          <ReviewRevealPlaceholder
            description="Checking priority missing points..."
            minHeightClass="min-h-[108px]"
            title="Priority missing points"
          />
          <ReviewRevealPlaceholder
            description="Preparing next draft target..."
            minHeightClass="min-h-[96px]"
            title="Next draft target"
          />
        </div>
      </ThreadBlock>
    </div>
  );
}

function ReviewRevealPlaceholder({
  title,
  description,
  minHeightClass = "min-h-[96px]",
  isEmphasized = false,
}: {
  title: string;
  description: string;
  minHeightClass?: string;
  isEmphasized?: boolean;
}) {
  return (
    <section
      className={`review-shimmer rounded-[22px] border px-4 py-4 ${minHeightClass} ${
        isEmphasized
          ? "border-sky-200 bg-sky-50/80 dark:border-sky-500/30 dark:bg-sky-500/12"
          : "border-slate-200 bg-white/85 dark:border-slate-800 dark:bg-slate-900/80"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          isEmphasized
            ? "text-sky-700 dark:text-sky-200"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </section>
  );
}

function PracticeHintPanel({
  hints,
  shouldOfferHint,
}: {
  hints: PracticeHintLevel[];
  shouldOfferHint: boolean;
}) {
  return (
    <section className="space-y-3">
      {shouldOfferHint ? (
        <div className="rounded-[18px] border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm leading-6 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          Looks like you&apos;re stuck. Want a hint?
        </div>
      ) : null}

      {hints.length > 0 ? (
        <div className="space-y-3">
          {hints.map((hint) => (
            <HintCard hint={hint} key={hint.level} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function HintCard({ hint }: { hint: PracticeHintLevel }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
        Hint {hint.level}: {hint.title}
      </p>
      {hint.lines.length > 1 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {hint.lines.map((line, index) => (
            <li className="flex gap-2" key={`${hint.level}-${index}`}>
              <span aria-hidden="true" className="text-sky-600 dark:text-sky-300">
                -
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {hint.lines[0]}
        </p>
      )}
    </section>
  );
}

function RewriteAidCard({
  items,
  nextDraftTarget,
}: {
  items: RubricAssessmentItem[];
  nextDraftTarget: string | null;
}) {
  return (
    <section className="sticky top-3 z-10 rounded-[22px] border border-sky-200 bg-sky-50/80 px-4 py-4 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">
        Rewrite aid
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
        Keep these priority gaps in view while you rewrite.
      </p>

      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Include these next
          </p>
          <CompactMissingList items={items} />
        </div>
      ) : null}

      {nextDraftTarget ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Next draft target
          </p>
          <div className="rounded-[18px] border border-sky-200 bg-white/80 px-3.5 py-3 text-sm leading-6 text-slate-800 dark:border-sky-500/30 dark:bg-slate-900/70 dark:text-slate-100">
            {nextDraftTarget}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type ReviewScoreSectionProps = {
  feedback: MarkAnswerResponse;
  isEmphasized?: boolean;
};

function ReviewScoreSection({
  feedback,
  isEmphasized = false,
}: ReviewScoreSectionProps) {
  const reviewSourceLabel = getReviewSourceLabel(feedback.reviewSource);
  const reviewSourceBadgeClassName =
    feedback.reviewSource === "ai_review"
      ? "border-sky-200 bg-white text-sky-700 dark:border-sky-500/40 dark:bg-slate-950 dark:text-sky-200"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100";

  return (
    <section
      className={`rounded-[22px] border px-4 py-4 ${
        isEmphasized
          ? "border-sky-200 bg-sky-50/75 shadow-sm dark:border-sky-500/30 dark:bg-sky-500/12"
          : "border-slate-200 bg-white/85 dark:border-slate-800 dark:bg-slate-900/80"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          isEmphasized
            ? "text-sky-700 dark:text-sky-200"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        Score
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p
          className={`font-semibold tracking-tight text-slate-950 dark:text-white ${
            isEmphasized ? "text-[2rem]" : "text-2xl"
          }`}
        >
          {feedback.score}/{feedback.maxScore}
        </p>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${reviewSourceBadgeClassName}`}
        >
          {reviewSourceLabel}
        </span>
      </div>
    </section>
  );
}

function ReviewSourceNotice({
  feedback,
}: {
  feedback: MarkAnswerResponse;
}) {
  if (feedback.reviewSource !== "fallback_review") {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      Fallback review shown. {feedback.fallbackReason}
    </div>
  );
}

type RubricAssessmentSectionProps = {
  title: string;
  items: RubricAssessmentItem[];
  status: RubricAssessmentItem["status"];
  emptyMessage?: string;
};

function RubricAssessmentSection({
  title,
  items,
  status,
  emptyMessage,
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
          {formatRubricPointDisplayText(item.pointText)}
        </li>
      ))}
    </ul>
  );
}

type RubricAssessmentRowProps = {
  item: RubricAssessmentItem;
  status: RubricAssessmentItem["status"];
};

function RubricAssessmentRow({ item, status }: RubricAssessmentRowProps) {
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
            {formatRubricPointDisplayText(item.pointText)}
          </p>
          {status !== "absent" ? (
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">
                Evidence:
              </span>{" "}
              {item.evidence}
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

function NextDraftTargetSection({
  nextStep,
  isEmphasized = false,
}: {
  nextStep: string | null;
  isEmphasized?: boolean;
}) {
  return (
    <section className="space-y-3">
      <p
        className={`text-sm font-semibold ${
          isEmphasized
            ? "text-sky-800 dark:text-sky-100"
            : "text-slate-900 dark:text-white"
        }`}
      >
        Next draft target
      </p>
      <div
        className={`rounded-[22px] border px-4 py-3 text-sm leading-6 ${
          isEmphasized
            ? "border-sky-300 bg-sky-100/85 text-sky-950 shadow-sm dark:border-sky-400/40 dark:bg-sky-500/18 dark:text-sky-50"
            : "border-sky-200 bg-sky-50/80 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100"
        }`}
      >
        {nextStep ?? "No priority rewrite target right now."}
      </div>
    </section>
  );
}

function OffTopicContentSection({
  offTopicPoints,
}: {
  offTopicPoints: string[];
}) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">
        Off-topic or unnecessary content
      </p>
      <ul className="overflow-hidden rounded-[20px] border border-dashed border-slate-300 bg-white/70 dark:border-slate-700 dark:bg-slate-900/60">
        {offTopicPoints.map((point, index) => (
          <li
            className={`px-4 py-3 text-sm leading-6 text-slate-600 dark:text-slate-300 ${
              index === 0 ? "" : "border-t border-slate-200/80 dark:border-slate-800/80"
            }`}
            key={`${point}-${index}`}
          >
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

type ModelAnswerSectionProps = {
  modelAnswer: string;
  isVisible: boolean;
  onToggle: () => void;
};

function ModelAnswerSection({
  modelAnswer,
  isVisible,
  onToggle,
}: ModelAnswerSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Model answer
        </p>
        <button
          aria-expanded={isVisible}
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-sky-500 dark:hover:text-sky-200"
          onClick={onToggle}
          type="button"
        >
          {isVisible ? "Hide model answer" : "Show model answer"}
        </button>
      </div>

      {isVisible ? (
        <div className="rounded-[22px] border border-slate-200 bg-white/85 px-4 py-4 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
          <p className="whitespace-pre-wrap">{modelAnswer}</p>
        </div>
      ) : null}
    </section>
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

function getSessionQuestionIds(threads: SessionThread[]) {
  return threads.map((thread) => Number(thread.question.questionId));
}

function buildSessionQuestionIdsKey(questionIds: number[]) {
  return questionIds.join("|");
}

function buildPrefetchScopeKey(
  selectionKey: string,
  questionFilterMode: PracticeQuestionFilterMode,
) {
  return `${selectionKey}::${questionFilterMode}`;
}

function buildPrefetchSlotKey(
  prefetchScopeKey: string,
  sessionQuestionIdsKey: string,
) {
  return `${prefetchScopeKey}::${sessionQuestionIdsKey}`;
}

function buildPrefetchRequestContextKey(
  prefetchSlotKey: string,
  currentQuestionId: string | null,
) {
  return `${prefetchSlotKey}::${currentQuestionId ?? "none"}`;
}

function isPrefetchedQuestionSlotValid(
  nextSlot: PrefetchedNextQuestionSlot | null,
  expectedSlotKey: string,
  sessionQuestionIds: number[],
) {
  if (!nextSlot || nextSlot.slotKey !== expectedSlotKey) {
    return false;
  }

  return !sessionQuestionIds.includes(Number(nextSlot.question.questionId));
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
    <div className="flex h-full min-h-0 items-start justify-center overflow-hidden border-l border-slate-200 bg-white px-2 pt-5 dark:border-slate-800 dark:bg-slate-950 xl:rounded-l-[26px] xl:border xl:border-r-0 xl:border-slate-200/80 xl:bg-slate-100/88 xl:shadow-[0_28px_60px_-46px_rgba(15,23,42,0.72)] xl:backdrop-blur-sm dark:xl:border-slate-800/80 dark:xl:bg-slate-950/92">
      <DesktopSidebarToggle
        ariaExpanded={false}
        ariaLabel="Reopen practice controls"
        className="h-9 w-9"
        direction="left"
        onClick={onExpand}
      />
    </div>
  );
}

type MobileSessionDrawerProps = {
  isPhoneLayout: boolean;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

function MobileSessionDrawer({
  isPhoneLayout,
  isOpen,
  onClose,
  children,
}: MobileSessionDrawerProps) {
  if (isPhoneLayout) {
    return (
      <div
        className={`fixed inset-0 z-50 px-3 pb-3 pt-3 transition-opacity duration-200 ease-out sm:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className={`mx-auto flex h-full w-full max-w-xl flex-col transition-[transform,opacity] duration-200 ease-out ${
            isOpen ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
          }`}
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            {children}
            <button
              aria-label="Close session panel"
              className="sr-only"
              onClick={onClose}
              type="button"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm transition-[transform,opacity] duration-200 ease-out will-change-transform xl:hidden ${
        isOpen
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none"
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

function PhoneStickyActionBar({
  keyboardOffset,
  isSkippingQuestion,
  submitDisabled,
  submitLabel,
  onSkipQuestion,
  onSubmitAnswer,
}: {
  keyboardOffset: number;
  isSkippingQuestion: boolean;
  submitDisabled: boolean;
  submitLabel: string;
  onSkipQuestion: () => void;
  onSubmitAnswer: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 px-4 sm:hidden"
      style={{
        bottom: `${keyboardOffset}px`,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[720px] rounded-[24px] border border-slate-200 bg-white/96 p-3 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.65)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/96">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3">
          <button
            className={secondaryButtonClass}
            disabled={isSkippingQuestion}
            onClick={onSkipQuestion}
            type="button"
          >
            {isSkippingQuestion ? "Skipping..." : "Skip"}
          </button>
          <button
            aria-label={submitLabel}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-20px_rgba(15,23,42,0.8)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            disabled={submitDisabled}
            onClick={onSubmitAnswer}
            type="button"
          >
            <span>Submit</span>
            <ArrowUpIcon className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getAttemptRevealKey(threadId: string, attemptNumber: number) {
  return `${threadId}:${attemptNumber}`;
}

function getAttemptRevealStage(
  attemptRevealState: AttemptRevealStateMap,
  threadId: string,
  attemptNumber: number,
) {
  return (
    attemptRevealState[getAttemptRevealKey(threadId, attemptNumber)] ?? "focused"
  );
}

function getMarkingProgressMessage(elapsedMilliseconds: number) {
  const progressMessageIndex = Math.min(
    Math.floor(elapsedMilliseconds / MARKING_PROGRESS_INTERVAL_MS),
    MARKING_PROGRESS_MESSAGES.length - 1,
  );

  return MARKING_PROGRESS_MESSAGES[progressMessageIndex]!;
}

function getActiveThread(threads: SessionThread[]) {
  const lastThread = threads[threads.length - 1] ?? null;

  if (!lastThread || lastThread.stage === "complete" || lastThread.stage === "skipped") {
    return null;
  }

  return lastThread;
}

function getThreadNumber(threads: SessionThread[], threadId: string) {
  const threadIndex = threads.findIndex((thread) => thread.threadId === threadId);

  return threadIndex >= 0 ? threadIndex + 1 : threads.length;
}

function isComposerVisibleForStage(stage: ThreadStage) {
  return stage === "question" || stage === "improving" || stage === "feedback";
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

  if (
    lastIndex < 0 ||
    nextThreads[lastIndex].stage === "complete" ||
    nextThreads[lastIndex].stage === "skipped"
  ) {
    return threads;
  }

  nextThreads[lastIndex] = updater(nextThreads[lastIndex]);

  return nextThreads;
}

function updateThreadById(
  threads: SessionThread[],
  threadId: string,
  updater: (thread: SessionThread) => SessionThread,
) {
  const threadIndex = threads.findIndex((thread) => thread.threadId === threadId);

  if (threadIndex < 0) {
    return {
      threads,
      found: false,
    };
  }

  const nextThreads = [...threads];
  nextThreads[threadIndex] = updater(nextThreads[threadIndex]);

  return {
    threads: nextThreads,
    found: true,
  };
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
    (body.modelAnswer === null || typeof body.modelAnswer === "string") &&
    Array.isArray(body.rubricPoints) &&
    body.rubricPoints.every((point) => {
      return (
        isRecord(point) &&
        typeof point.id === "number" &&
        typeof point.pointText === "string" &&
        typeof point.orderNumber === "number"
      );
    })
  );
}

function isMarkAnswerResponse(body: unknown): body is MarkAnswerResponse {
  return (
    isRecord(body) &&
    isPracticeReviewSource(body.reviewSource) &&
    (body.reviewSource !== "fallback_review" ||
      typeof body.fallbackReason === "string") &&
    typeof body.score === "number" &&
    typeof body.maxScore === "number" &&
    Array.isArray(body.rubricAssessment) &&
    body.rubricAssessment.every((assessment) => {
      return (
        isRecord(assessment) &&
        typeof assessment.pointText === "string" &&
        isRubricAssessmentStatus(assessment.status) &&
        typeof assessment.evidence === "string"
      );
    }) &&
    isRecord(body.feedback) &&
    typeof body.feedback.nextStep === "string" &&
    (!("offTopicPoints" in body.feedback) ||
      body.feedback.offTopicPoints === undefined ||
      (Array.isArray(body.feedback.offTopicPoints) &&
        body.feedback.offTopicPoints.every(
          (point) => typeof point === "string",
        )))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPracticeReviewSource(value: unknown): value is PracticeReviewSource {
  return value === "ai_review" || value === "fallback_review";
}

function isRubricAssessmentStatus(
  value: unknown,
): value is "present" | "partial" | "absent" {
  return value === "present" || value === "partial" || value === "absent";
}

function getReviewSourceLabel(reviewSource: PracticeReviewSource) {
  return reviewSource === "fallback_review" ? "Fallback review" : "AI review";
}

function getReviewToggleLabel(
  reviewSource: PracticeReviewSource,
  isCollapsed: boolean,
) {
  const reviewLabel =
    reviewSource === "fallback_review" ? "fallback review" : "AI review";

  return isCollapsed ? `Show ${reviewLabel}` : `Hide ${reviewLabel}`;
}

function getCollapsedReviewMessage(reviewSource: PracticeReviewSource) {
  return reviewSource === "fallback_review"
    ? "Fallback review hidden while you draft. Reopen it anytime if you want to check the response again."
    : "AI review hidden while you draft. Reopen it anytime if you want to check the feedback again.";
}

function logPracticeMarkingEvent(
  event: string,
  details: Record<string, unknown>,
) {
  if (!SHOULD_LOG_CLIENT_MARKING || typeof window === "undefined") {
    return;
  }

  console.info(`[practice-marking] ${event}`, details);
}

function warnPracticeMarkingEvent(
  event: string,
  details: Record<string, unknown>,
) {
  if (!SHOULD_LOG_CLIENT_MARKING || typeof window === "undefined") {
    return;
  }

  console.warn(`[practice-marking] ${event}`, details);
}

function getMarkAnswerResponseLogSummary(body: unknown) {
  if (!isMarkAnswerResponse(body)) {
    return {};
  }

  return {
    rubricAssessmentSummary: getRubricAssessmentLogSummary(body.rubricAssessment),
  };
}

function getRubricAssessmentLogSummary(
  rubricAssessment: MarkAnswerResponse["rubricAssessment"],
) {
  return {
    absentPoints: rubricAssessment
      .filter((item) => item.status === "absent")
      .map((item) => item.pointText),
    partialPoints: rubricAssessment
      .filter((item) => item.status === "partial")
      .map((item) => item.pointText),
    presentPoints: rubricAssessment
      .filter((item) => item.status === "present")
      .map((item) => item.pointText),
  };
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

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 18V6m0 0-5 5m5-5 5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
