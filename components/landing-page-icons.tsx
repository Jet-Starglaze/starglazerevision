export default function LandingPageIcons() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      <div className="absolute left-[4%] top-[5%] w-16 text-cyan-400 opacity-95 motion-safe:animate-[float_18s_ease-in-out_infinite] dark:text-cyan-200 dark:opacity-34 sm:w-20">
        <GlobeIcon className="h-full w-full" />
      </div>

      <div className="absolute right-[7%] top-[9%] w-18 rotate-[10deg] text-emerald-400 opacity-88 motion-safe:animate-[drift_22s_ease-in-out_infinite] dark:text-emerald-200 dark:opacity-34 sm:w-24">
        <DnaIcon className="h-full w-full" />
      </div>

      <div className="absolute left-[7%] top-[28%] hidden w-18 -rotate-[8deg] text-orange-300 opacity-88 motion-safe:animate-[drift_20s_ease-in-out_infinite] dark:text-orange-200 dark:opacity-34 md:block sm:w-24">
        <BookIcon className="h-full w-full" />
      </div>

      <div className="absolute right-[5%] top-[34%] w-16 rotate-[6deg] text-rose-300 opacity-86 motion-safe:animate-[float_20s_ease-in-out_infinite] dark:text-rose-200 dark:opacity-34 sm:w-20">
        <CalculatorIcon className="h-full w-full" />
      </div>

      <div className="absolute left-[10%] top-[58%] w-16 -rotate-[10deg] text-sky-300 opacity-86 motion-safe:animate-[float_19s_ease-in-out_infinite] dark:text-sky-200 dark:opacity-32 sm:w-20">
        <FlaskIcon className="h-full w-full" />
      </div>

      <div className="absolute right-[12%] top-[70%] hidden w-18 text-fuchsia-300 opacity-82 motion-safe:animate-[drift_24s_ease-in-out_infinite] dark:text-fuchsia-200 dark:opacity-30 md:block sm:w-24">
        <AtomIcon className="h-full w-full" />
      </div>

      <div className="absolute left-[18%] top-[84%] hidden w-18 -rotate-[12deg] text-amber-300 opacity-82 motion-safe:animate-[float_21s_ease-in-out_infinite] dark:text-amber-200 dark:opacity-30 lg:block sm:w-24">
        <PencilIcon className="h-full w-full" />
      </div>
    </div>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="2.6" />
      <path
        d="M10 22c4.2.1 7.4 1 9.6 2.8 2.2 1.7 3.6 4.5 4.4 8.3M16.5 9c2 1.8 3.2 3.6 3.8 5.5.5 1.8.3 4-.7 6.6l7.4 5.5c2.5-.3 4.6-1.3 6.2-2.9 1.7-1.7 2.8-4 3.2-6.9M12.5 35.3c2.9-.8 5.1-2.2 6.6-4.3 1.5-2 2.4-4.7 2.7-8.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function DnaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 12c6 0 9.4 3.3 12 8 2.7 4.7 6 8 12 8M12 36c6 0 9.4-3.3 12-8 2.7-4.7 6-8 12-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.8"
      />
      <path
        d="M18 13l-3 6M24 18l-3 6M30 23l-3 6M36 28l-3 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 13.5c5.8-2.8 11.1-3.3 16-1.5v22c-4.9-1.8-10.2-1.3-16 1.5v-22ZM40 13.5c-5.8-2.8-11.1-3.3-16-1.5v22c4.9-1.8 10.2-1.3 16 1.5v-22Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        d="M24 13v22"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}

function CalculatorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="30"
        rx="6"
        stroke="currentColor"
        strokeWidth="2.5"
        width="22"
        x="13"
        y="9"
      />
      <path
        d="M18 17h12M19 24h3m4 0h3m-10 6h3m4 0h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 8h8M22 8v9l-8.8 14.4A5 5 0 0 0 17.5 39h13a5 5 0 0 0 4.3-7.6L26 17V8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        d="M18 29c2.5 1.8 5.1 2.7 7.8 2.7 2.4 0 4.8-.7 7.2-2.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}

function AtomIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="3.5" stroke="currentColor" strokeWidth="2.4" />
      <path
        d="M24 7c7 0 12.5 7.6 12.5 17S31 41 24 41 11.5 33.4 11.5 24 17 7 24 7Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M14.8 12.3c6.1-3.5 15 0 19.9 7.8 4.8 7.8 3.7 17-2.4 20.5-6.1 3.5-15 0-19.8-7.8-4.9-7.8-3.8-17 2.3-20.5ZM33.2 12.3c-6.1-3.5-15 0-19.9 7.8-4.8 7.8-3.7 17 2.4 20.5 6.1 3.5 15 0 19.8-7.8 4.9-7.8 3.8-17-2.3-20.5Z"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 32.5 29.8 15.7a4 4 0 0 1 5.6 0l2.9 2.9a4 4 0 0 1 0 5.6L21.5 41H13v-8.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <path
        d="m26.8 18.7 6.5 6.5M13 41l7.7-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.1"
      />
    </svg>
  );
}
