import { useEffect, useRef, type KeyboardEvent } from "react";

type PracticeInputBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  readOnly?: boolean;
  submitDisabled?: boolean;
};

export default function PracticeInputBar({
  value,
  onValueChange,
  onSubmit,
  readOnly = false,
  submitDisabled = false,
}: PracticeInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDisabled = readOnly || submitDisabled;

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, 152),
      320,
    )}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();

      if (!isDisabled) {
        onSubmit();
      }
    }
  }

  return (
    <div className="rounded-[32px] border border-slate-200/80 bg-white/92 px-4 py-4 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-slate-300 focus-within:bg-white dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_30px_80px_-56px_rgba(2,6,23,0.98)] dark:focus-within:border-sky-400/40 dark:focus-within:bg-slate-900/96 sm:px-5 sm:py-5">
      <textarea
        aria-label="Write your answer"
        className="min-h-[152px] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400/90 dark:text-white dark:placeholder:text-slate-500"
        id="practice-composer"
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your answer..."
        readOnly={readOnly}
        ref={textareaRef}
        rows={1}
        value={value}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          Ctrl+Enter
        </span>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_-20px_rgba(15,23,42,0.8)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          disabled={isDisabled}
          onClick={onSubmit}
          type="button"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
