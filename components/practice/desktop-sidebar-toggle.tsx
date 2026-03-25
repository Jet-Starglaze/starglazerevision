type DesktopSidebarToggleProps = {
  ariaExpanded: boolean;
  ariaLabel: string;
  direction: "left" | "right";
  onClick: () => void;
  className?: string;
  title?: string;
};

const buttonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/92 text-slate-500 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.85)] backdrop-blur-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/92 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-950 dark:hover:text-white";

export default function DesktopSidebarToggle({
  ariaExpanded,
  ariaLabel,
  direction,
  onClick,
  className,
  title,
}: DesktopSidebarToggleProps) {
  return (
    <button
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      className={`${buttonClassName} ${className ?? ""}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      <ChevronIcon
        className={`h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${
          direction === "left" ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m9.25 6.75 5.5 5.25-5.5 5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}
