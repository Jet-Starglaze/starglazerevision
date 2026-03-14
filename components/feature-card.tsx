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
    <article className="group relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/78 p-6 shadow-[0_24px_60px_-36px_rgba(91,33,182,0.28)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_32px_70px_-34px_rgba(91,33,182,0.38)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_26px_70px_-36px_rgba(0,0,0,0.8)]">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/80 to-transparent opacity-80" />

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25">
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
