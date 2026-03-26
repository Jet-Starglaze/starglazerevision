import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";

type PracticeInputBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onSecondaryAction?: () => void;
  readOnly?: boolean;
  submitDisabled?: boolean;
  submitAriaLabel?: string;
  secondaryActionLabel?: string;
  secondaryActionDisabled?: boolean;
  secondaryActionAriaLabel?: string;
  footerNote?: ReactNode;
  focusTrigger?: number;
  isRewriteEmphasized?: boolean;
  layout?: "default" | "phone";
  showInlineActions?: boolean;
};

export default function PracticeInputBar({
  value,
  onValueChange,
  onSubmit,
  onSecondaryAction,
  readOnly = false,
  submitDisabled = false,
  submitAriaLabel = "Submit answer",
  secondaryActionLabel,
  secondaryActionDisabled = false,
  secondaryActionAriaLabel,
  footerNote,
  focusTrigger = 0,
  isRewriteEmphasized = false,
  layout = "default",
  showInlineActions = true,
}: PracticeInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const isRecognitionStartingRef = useRef(false);
  const latestValueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const onSubmitRef = useRef(onSubmit);
  const pendingSubmitAfterListeningRef = useRef(false);
  const hasMicrophonePermissionRef = useRef(false);
  const [speechSupport, setSpeechSupport] =
    useState<SpeechSupportState>("unsupported");
  const [speechErrorMessage, setSpeechErrorMessage] = useState<string | null>(
    null,
  );
  const [isListening, setIsListening] = useState(false);
  const isSubmitDisabled = readOnly || submitDisabled;
  const isSecondaryActionDisabled =
    readOnly || secondaryActionDisabled || !onSecondaryAction;
  const isMicrophoneDisabled =
    readOnly || speechSupport !== "supported";
  const isPhoneLayout = layout === "phone";
  const textareaMinHeight = isPhoneLayout ? 208 : 136;
  const textareaMaxHeight = isPhoneLayout ? 420 : 300;
  const containerClassName = isPhoneLayout
    ? isRewriteEmphasized
      ? "rounded-[28px] border border-sky-200/80 bg-white px-4 py-4 shadow-[0_26px_80px_-56px_rgba(14,116,144,0.5)] ring-1 ring-sky-100/80 backdrop-blur-xl transition-[border-color,box-shadow,background-color,transform] duration-200 focus-within:border-sky-300 focus-within:shadow-[0_28px_86px_-58px_rgba(2,132,199,0.48)] dark:border-sky-500/30 dark:bg-slate-900/92 dark:ring-sky-500/10 dark:focus-within:border-sky-400/60 dark:focus-within:bg-slate-900/98"
      : "rounded-[28px] border border-slate-200/80 bg-white/96 px-4 py-4 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-slate-300 focus-within:bg-white dark:border-white/10 dark:bg-slate-900/92 dark:shadow-[0_30px_80px_-56px_rgba(2,6,23,0.98)] dark:focus-within:border-sky-400/40 dark:focus-within:bg-slate-900/96"
    : isRewriteEmphasized
      ? "rounded-[30px] border border-sky-200/80 bg-white px-4 py-4 shadow-[0_26px_80px_-56px_rgba(14,116,144,0.5)] ring-1 ring-sky-100/80 backdrop-blur-xl transition-[border-color,box-shadow,background-color,transform] duration-200 focus-within:border-sky-300 focus-within:shadow-[0_28px_86px_-58px_rgba(2,132,199,0.48)] dark:border-sky-500/30 dark:bg-slate-900/92 dark:ring-sky-500/10 dark:focus-within:border-sky-400/60 dark:focus-within:bg-slate-900/98"
      : "rounded-[30px] border border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-slate-300 focus-within:bg-white dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_80px_-56px_rgba(2,6,23,0.98)] dark:focus-within:border-sky-400/40 dark:focus-within:bg-slate-900/96";
  const voiceStatusMessage = isListening
    ? "Listening... click the mic again to stop."
    : speechSupport === "blocked"
      ? "Voice input needs HTTPS or localhost in this browser."
    : speechSupport === "unsupported"
      ? null
      : speechErrorMessage;
  const voiceStatusClassName = isListening
    ? "text-rose-700 dark:text-rose-300"
    : speechErrorMessage
      ? "text-amber-700 dark:text-amber-300"
      : "text-slate-500 dark:text-slate-400";

  useEffect(() => {
    latestValueRef.current = value;
    onValueChangeRef.current = onValueChange;
    onSubmitRef.current = onSubmit;
  }, [value, onValueChange, onSubmit]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, textareaMinHeight),
      textareaMaxHeight,
    )}px`;
  }, [textareaMaxHeight, textareaMinHeight, value]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSpeechSupport(getMountedSpeechSupport());
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!focusTrigger || readOnly) {
      return;
    }

    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true });
      const cursorPosition = textarea.value.length;
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [focusTrigger, readOnly]);

  useEffect(() => {
    if (!readOnly) {
      return;
    }

    pendingSubmitAfterListeningRef.current = false;
    isRecognitionStartingRef.current = false;
    hasMicrophonePermissionRef.current = false;
    stopSpeechRecognition(recognitionRef);
  }, [readOnly]);

  useEffect(() => {
    return () => {
      pendingSubmitAfterListeningRef.current = false;
      isRecognitionStartingRef.current = false;
      hasMicrophonePermissionRef.current = false;
      destroySpeechRecognition(recognitionRef);
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();

      if (!isSubmitDisabled) {
        handleSubmit();
      }
    }
  }

  function createRecognition() {
    const RecognitionConstructor = getSpeechRecognitionConstructor();

    if (!RecognitionConstructor) {
      setSpeechSupport("unsupported");
      setSpeechErrorMessage(
        "Voice input needs Chrome or Edge for this free browser-based placeholder.",
      );
      return null;
    }

    const recognition = new RecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-GB";
    recognition.onstart = () => {
      isRecognitionStartingRef.current = false;
      setIsListening(true);
      setSpeechErrorMessage(null);
    };
    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let resultIndex = event.resultIndex;
        resultIndex < event.results.length;
        resultIndex += 1
      ) {
        const result = event.results[resultIndex];
        const transcriptPart = result?.[0]?.transcript?.trim() ?? "";

        if (!transcriptPart) {
          continue;
        }

        transcript = transcript
          ? `${transcript} ${transcriptPart}`
          : transcriptPart;
      }

      if (!transcript) {
        return;
      }

      onValueChangeRef.current(
        appendRecognizedTranscript(latestValueRef.current, transcript),
      );
    };
    recognition.onerror = (event) => {
      isRecognitionStartingRef.current = false;
      setSpeechErrorMessage(getSpeechRecognitionErrorMessage(event.error));
    };
    recognition.onend = () => {
      isRecognitionStartingRef.current = false;
      setIsListening(false);

      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      if (pendingSubmitAfterListeningRef.current) {
        pendingSubmitAfterListeningRef.current = false;
        onSubmitRef.current();
      }
    };
    recognitionRef.current = recognition;
    return recognition;
  }

  function handleSubmit() {
    if (isSubmitDisabled) {
      return;
    }

    if (isListening) {
      pendingSubmitAfterListeningRef.current = true;

      if (!stopSpeechRecognition(recognitionRef)) {
        pendingSubmitAfterListeningRef.current = false;
        onSubmit();
      }

      return;
    }

    onSubmit();
  }

  function handleMicrophoneToggle() {
    void toggleMicrophone();
  }

  async function ensureMicrophoneAccess() {
    if (hasMicrophonePermissionRef.current) {
      return true;
    }

    if (!hasNavigatorMicrophoneAccess()) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      stream.getTracks().forEach((track) => track.stop());
      hasMicrophonePermissionRef.current = true;
      return true;
    } catch (error) {
      setSpeechErrorMessage(getMicrophoneAccessErrorMessage(error));
      return false;
    }
  }

  async function toggleMicrophone() {
    if (isMicrophoneDisabled) {
      return;
    }

    if (isListening || isRecognitionStartingRef.current) {
      pendingSubmitAfterListeningRef.current = false;
      stopSpeechRecognition(recognitionRef);
      return;
    }

    if (!isSpeechRecognitionRunnable()) {
      setSpeechErrorMessage(
        "Voice input needs HTTPS or localhost in this browser.",
      );
      return;
    }

    const hasMicrophoneAccess = await ensureMicrophoneAccess();

    if (!hasMicrophoneAccess) {
      return;
    }

    destroySpeechRecognition(recognitionRef);

    const recognition = createRecognition();

    if (!recognition) {
      return;
    }

    setSpeechErrorMessage(null);
    isRecognitionStartingRef.current = true;

    try {
      recognition.start();
    } catch (error) {
      isRecognitionStartingRef.current = false;
      destroySpeechRecognition(recognitionRef);
      setSpeechErrorMessage(getSpeechRecognitionStartErrorMessage(error));
    }
  }

  return (
    <div className={`${containerClassName} sm:px-5 sm:py-5`}>
      <textarea
        aria-label="Write your answer"
        className={`w-full resize-none overflow-y-auto bg-transparent outline-none placeholder:text-slate-400/90 dark:text-white dark:placeholder:text-slate-500 ${
          isPhoneLayout
            ? "min-h-[208px] text-base leading-7 text-slate-900"
            : "min-h-[136px] text-[15px] leading-7 text-slate-900"
        }`}
        id="practice-composer"
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your answer..."
        readOnly={readOnly}
        ref={textareaRef}
        rows={1}
        value={value}
      />

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {showInlineActions ? (
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Ctrl+Enter
            </div>
          ) : null}

          {footerNote ? (
            <div className="text-[11px] font-medium text-sky-700 dark:text-sky-200">
              {footerNote}
            </div>
          ) : null}

          {voiceStatusMessage ? (
            <p className={`text-[11px] font-medium ${voiceStatusClassName}`}>
              {voiceStatusMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {showInlineActions && secondaryActionLabel ? (
            <button
              aria-label={secondaryActionAriaLabel ?? secondaryActionLabel}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-slate-100 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-white dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              disabled={isSecondaryActionDisabled}
              onClick={onSecondaryAction}
              type="button"
            >
              {secondaryActionLabel}
            </button>
          ) : null}

          <button
            aria-label={
              speechSupport === "unsupported"
                ? "Voice input unavailable"
                : isListening
                  ? "Stop voice input"
                  : "Start voice input"
            }
            aria-pressed={isListening}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition ${
              isListening
                ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/20"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-200"
            } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-600`}
            disabled={isMicrophoneDisabled}
            onClick={handleMicrophoneToggle}
            type="button"
          >
            <MicrophoneIcon
              className={`h-[18px] w-[18px] ${isListening ? "animate-pulse" : ""}`}
            />
          </button>

          {showInlineActions ? (
            <button
              aria-label={submitAriaLabel}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_14px_30px_-20px_rgba(15,23,42,0.8)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              disabled={isSubmitDisabled}
              onClick={handleSubmit}
              type="button"
            >
              <span className="sr-only">{submitAriaLabel}</span>
              <ArrowUpIcon className="h-[18px] w-[18px]" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type SpeechSupportState = "supported" | "unsupported" | "blocked";

type BrowserSpeechRecognitionAlternative = {
  transcript: string;
};

type BrowserSpeechRecognitionResult = {
  0: BrowserSpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionResultList = {
  [index: number]: BrowserSpeechRecognitionResult;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: BrowserSpeechRecognitionResultList;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.SpeechRecognition ??
    window.webkitSpeechRecognition ??
    null
  );
}

function isSpeechRecognitionRunnable() {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.isSecureContext) {
    return true;
  }

  const hostname = window.location.hostname;

  return hostname === "localhost" || hostname === "127.0.0.1";
}

function getMountedSpeechSupport(): SpeechSupportState {
  if (isOperaBrowser()) {
    return "unsupported";
  }

  if (!getSpeechRecognitionConstructor()) {
    return "unsupported";
  }

  return isSpeechRecognitionRunnable() ? "supported" : "blocked";
}

function hasNavigatorMicrophoneAccess() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

function isOperaBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /\bOPR\//.test(navigator.userAgent);
}

function appendRecognizedTranscript(currentValue: string, transcript: string) {
  const trimmedTranscript = transcript.trim();

  if (!trimmedTranscript) {
    return currentValue;
  }

  if (!currentValue.trim()) {
    return trimmedTranscript;
  }

  return /\s$/.test(currentValue)
    ? `${currentValue}${trimmedTranscript}`
    : `${currentValue} ${trimmedTranscript}`;
}

function getSpeechRecognitionErrorMessage(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was blocked. You can keep typing instead.";
    case "audio-capture":
      return "No microphone was detected. You can keep typing instead.";
    case "no-speech":
      return "No speech was detected. Try again or keep typing.";
    default:
      return "Voice input stopped. You can keep typing or try again.";
  }
}

function getSpeechRecognitionStartErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    switch (error.name) {
      case "InvalidStateError":
        return "Voice input was already starting. Try the mic again in a moment.";
      case "NotAllowedError":
      case "SecurityError":
        return "Voice input needs microphone permission in this browser.";
      case "NotSupportedError":
        return "Voice input is not available in this browser yet.";
      default:
        break;
    }
  }

  return "Voice input could not start here. You can keep typing instead.";
}

function getMicrophoneAccessErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Microphone access was blocked. Allow mic access and try again.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No microphone was detected on this device.";
      case "NotReadableError":
      case "TrackStartError":
        return "Your microphone is busy in another app. Close that app and try again.";
      default:
        break;
    }
  }

  return "Microphone access could not start. You can keep typing instead.";
}

function stopSpeechRecognition(
  recognitionRef: MutableRefObject<BrowserSpeechRecognition | null>,
) {
  const recognition = recognitionRef.current;

  if (!recognition) {
    return false;
  }

  try {
    recognition.stop();
    return true;
  } catch {
    return false;
  }
}

function destroySpeechRecognition(
  recognitionRef: MutableRefObject<BrowserSpeechRecognition | null>,
) {
  const recognition = recognitionRef.current;

  if (!recognition) {
    return;
  }

  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;

  try {
    recognition.abort();
  } catch {
    // No-op cleanup fallback for browsers with partial implementations.
  }

  recognitionRef.current = null;
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 4.5a2.75 2.75 0 0 1 2.75 2.75v4.5a2.75 2.75 0 1 1-5.5 0v-4.5A2.75 2.75 0 0 1 12 4.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.75 11.25a5.25 5.25 0 1 0 10.5 0M12 16.5v3m-3 0h6"
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
        d="M12 18V6m0 0-4.5 4.5M12 6l4.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
