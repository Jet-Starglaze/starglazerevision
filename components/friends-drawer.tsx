"use client";

import { useEffect, useId, useState } from "react";

type FriendItem = {
  id: string;
  name: string;
  status: "Online" | "In session" | "Offline";
  focus: string;
  note: string;
};

// TODO: Replace this placeholder list with real friends / activity data later.
const placeholderFriends: FriendItem[] = [
  {
    id: "maya",
    name: "Maya",
    status: "Online",
    focus: "OCR A Level Biology A",
    note: "Reviewing cell structure flash points.",
  },
  {
    id: "josh",
    name: "Josh",
    status: "In session",
    focus: "Long-answer practice",
    note: "Working through an essay plan before tonight's revision block.",
  },
  {
    id: "amina",
    name: "Amina",
    status: "Offline",
    focus: "A Level Psychology",
    note: "Saved as a placeholder friend until real social features are wired in.",
  },
];

export default function FriendsDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-950/25 transition duration-300 dark:bg-slate-950/50 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={`fixed inset-y-3 right-0 z-40 w-[22rem] max-w-[calc(100vw-1rem)] transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close friends panel" : "Open friends panel"}
          className="absolute left-0 top-1/2 inline-flex -translate-x-full -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-700 shadow-lg transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          <FriendsIcon className="h-5 w-5" />
          <span>Friends</span>
        </button>

        <aside
          aria-hidden={!isOpen}
          aria-label="Friends panel"
          aria-modal={isOpen || undefined}
          className="flex h-full flex-col overflow-hidden rounded-l-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
          id={panelId}
          role={isOpen ? "dialog" : undefined}
        >
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-200">
                  Placeholder social
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  Friends
                </h2>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  A simple right-side drawer for future friends and study
                  activity.
                </p>
              </div>

              <button
                aria-label="Close friends panel"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {placeholderFriends.map((friend) => (
              <article
                key={friend.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                      {friend.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {friend.focus}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      friend.status === "Online"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : friend.status === "In session"
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                          : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {friend.status}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {friend.note}
                </p>
              </article>
            ))}
          </div>

          <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              This is a UI placeholder for now. Later you can wire real friends,
              activity, invites, or study rooms into this drawer.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

function FriendsIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M8.25 11.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.75 18.25a4.5 4.5 0 0 1 9 0m2.5 0a4.5 4.5 0 0 1 5-4.47 4.5 4.5 0 0 1 .5 4.47"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m7.75 7.75 8.5 8.5m0-8.5-8.5 8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
