import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export default function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <article className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:border-sky-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
        {icon}
      </div>

      <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {title}
      </h3>

      <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
        {description}
      </p>
    </article>
  );
}
