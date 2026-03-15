import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  prefetch?: boolean;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
        {items.map((item, index) => {
          const isLastItem = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  /
                </span>
              ) : null}
              {item.href && !isLastItem ? (
                <Link
                  className="transition hover:text-sky-700 dark:hover:text-sky-200"
                  href={item.href}
                  prefetch={item.prefetch}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLastItem ? "page" : undefined}
                  className="font-medium text-slate-700 dark:text-slate-200"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
