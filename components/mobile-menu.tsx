"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

type MobileMenuProps = {
  items: NavItem[];
};

export default function MobileMenu({ items }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function closeMenu() {
    setIsOpen(false);
  }

  const glassPanelStyle = {
    backdropFilter: "blur(32px) saturate(190%)",
    WebkitBackdropFilter: "blur(32px) saturate(190%)",
  };

  return (
    <div ref={menuRef} className="relative md:hidden">
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-100 bg-white/90 text-slate-800 shadow-[0_14px_32px_-18px_rgba(15,23,42,0.2)] transition hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:bg-slate-950/72 dark:text-slate-100 dark:hover:border-sky-400/40 dark:hover:text-sky-200"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="relative h-4 w-5">
          <span
            className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
              isOpen ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition duration-300 ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition duration-300 ${
              isOpen ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      <div
        className={`absolute right-[-1rem] top-[calc(100%+0.75rem)] z-50 w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] origin-top-right transition duration-200 ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div
          className="relative overflow-hidden rounded-[1.6rem] border border-white/60 bg-white/34 shadow-[0_24px_60px_-30px_rgba(14,116,144,0.28)] supports-[backdrop-filter]:bg-white/22 dark:border-white/12 dark:bg-slate-950/42 dark:shadow-[0_28px_72px_-34px_rgba(0,0,0,0.88)] dark:supports-[backdrop-filter]:bg-slate-950/28"
          style={glassPanelStyle}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(219,234,254,0.36))] dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.42),rgba(2,6,23,0.22))]" />
          <div className="pointer-events-none absolute inset-px rounded-[calc(1.6rem-1px)] border border-white/45 dark:border-white/8" />

          <div className="relative p-3">
            <nav className="flex flex-col gap-2">
            {items.map((item, index) => {
              const itemClassName =
                "w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition duration-200 hover:bg-white/42 hover:text-sky-700 dark:text-slate-200 dark:hover:bg-white/[0.08] dark:hover:text-sky-200";

              const itemStyle = {
                transitionDelay: isOpen ? `${index * 35}ms` : "0ms",
              };

              return item.href.startsWith("#") ? (
                <a
                  key={item.href}
                  className={`${itemClassName} ${
                    isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                  }`}
                  href={item.href}
                  onClick={closeMenu}
                  style={itemStyle}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  className={`${itemClassName} ${
                    isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                  }`}
                  href={item.href}
                  onClick={closeMenu}
                  style={itemStyle}
                >
                  {item.label}
                </Link>
              );
            })}
            </nav>

            <Link
              className={`mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_-18px_rgba(37,99,235,0.56)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-18px_rgba(37,99,235,0.54)] ${
                isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
              }`}
              href="/login"
              onClick={closeMenu}
              style={{
                transitionDelay: isOpen ? `${items.length * 35}ms` : "0ms",
              }}
            >
              Start Revising
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
