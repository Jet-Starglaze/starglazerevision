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
    <article className="group h-full rounded-[1.6rem] border border-sky-100/80 bg-white/92 p-6 shadow-[0_18px_52px_-36px_rgba(14,116,144,0.2)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_24px_60px_-34px_rgba(37,99,235,0.24)] dark:border-white/10 dark:bg-slate-950/58 dark:shadow-[0_24px_70px_-42px_rgba(0,0,0,0.82)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.56)]">
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
