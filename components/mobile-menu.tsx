"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavLinkItem } from "@/lib/navigation";

type MobileMenuProps = {
  items: NavLinkItem[];
  primaryAction: NavLinkItem;
};

export default function MobileMenu({
  items,
  primaryAction,
}: MobileMenuProps) {
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

  return (
    <div ref={menuRef} className="relative md:hidden">
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-sky-500 dark:hover:text-sky-200"
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
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-950">
          <div className="p-3">
            <nav className="flex flex-col gap-2">
            {items.map((item, index) => {
              const itemClassName =
                "w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition duration-200 hover:bg-slate-100 hover:text-sky-700 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-sky-200";

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
                  prefetch={item.prefetch}
                  style={itemStyle}
                >
                  {item.label}
                </Link>
              );
            })}
            </nav>

            <Link
              className={`mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:from-sky-700 hover:to-blue-800 ${
                isOpen ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
              }`}
              href={primaryAction.href}
              onClick={closeMenu}
              prefetch={primaryAction.prefetch}
              style={{
                transitionDelay: isOpen ? `${items.length * 35}ms` : "0ms",
              }}
            >
              {primaryAction.label}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
