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
      className={`inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-sky-200 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      {label}
    </span>
  );
}
