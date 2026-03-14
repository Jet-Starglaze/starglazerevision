type SubjectPillProps = {
  label: string;
  className?: string;
};

export default function SubjectPill({
  label,
  className = "",
}: SubjectPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/92 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm shadow-sky-950/5 dark:border-sky-400/20 dark:bg-slate-950/65 dark:text-sky-200 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      {label}
    </span>
  );
}
