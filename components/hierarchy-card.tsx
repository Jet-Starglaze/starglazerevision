import Link from "next/link";

type HierarchyCardProps = {
  href: string;
  eyebrow?: string;
  title: string;
  description?: string;
  footer?: string;
  prefetch?: boolean;
};

export default function HierarchyCard({
  href,
  eyebrow,
  title,
  description,
  footer,
  prefetch,
}: HierarchyCardProps) {
  return (
    <Link
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-700 dark:hover:bg-slate-900"
      href={href}
      prefetch={prefetch}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
          {eyebrow}
        </p>
      ) : null}

      <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {title}
      </h2>

      {description ? (
        <p className="mt-3 flex-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <div className="mt-5 flex items-center justify-between text-sm font-semibold text-slate-600 transition group-hover:text-sky-700 dark:text-slate-300 dark:group-hover:text-sky-200">
        <span>{footer ?? "Open"}</span>
        <span aria-hidden="true">-&gt;</span>
      </div>
    </Link>
  );
}
