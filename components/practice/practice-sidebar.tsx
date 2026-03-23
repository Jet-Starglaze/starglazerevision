"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import type {
  PracticeModule,
  PracticeSubtopic,
  PracticeTopic,
} from "@/lib/mock-biology-practice";

type PracticeSidebarProps = {
  subjectName: string;
  modules: PracticeModule[];
  selectedSubtopicIds: ReadonlySet<number>;
  expandedModuleIds: number[];
  expandedTopicIds: number[];
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  onToggleExpandedModule: (moduleId: number) => void;
  onToggleExpandedTopic: (topicId: number) => void;
  onToggleModuleSelection: (moduleId: number) => void;
  onToggleTopicSelection: (topicId: number) => void;
  onToggleSubtopicSelection: (subtopicId: number) => void;
  onClearSelection: () => void;
  className?: string;
  onClose?: () => void;
};

const asideClassName = "h-full min-h-0 bg-white dark:bg-slate-950";

const panelClassName =
  "flex h-full min-h-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";

export default function PracticeSidebar({
  subjectName,
  modules,
  selectedSubtopicIds,
  expandedModuleIds,
  expandedTopicIds,
  isCollapsed = false,
  onToggleCollapsed,
  onToggleExpandedModule,
  onToggleExpandedTopic,
  onToggleModuleSelection,
  onToggleTopicSelection,
  onToggleSubtopicSelection,
  onClearSelection,
  className,
  onClose,
}: PracticeSidebarProps) {
  const headerAction = onClose ? (
    <button
      aria-label="Close syllabus"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
      onClick={onClose}
      type="button"
    >
      <CloseIcon className="h-4 w-4" />
    </button>
  ) : onToggleCollapsed ? (
    <button
      aria-expanded="true"
      aria-label="Collapse syllabus"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
      onClick={onToggleCollapsed}
      type="button"
    >
      <PanelCollapseIcon className="h-4 w-4" />
    </button>
  ) : null;

  const collapsedRail = (
    <div className={panelClassName}>
      <div className="flex h-full min-h-0 flex-col items-center px-3 py-5">
        <button
          aria-expanded="false"
          aria-label="Expand syllabus"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
          onClick={onToggleCollapsed}
          type="button"
        >
          <PanelExpandIcon className="h-4 w-4" />
        </button>

        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-200">
            Syllabus
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {selectedSubtopicIds.size} selected
          </div>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Reopen the rail to change topics.
        </p>

        <div className="mt-auto pt-4">
          <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-sky-50 px-3 text-sm font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
            {selectedSubtopicIds.size}
          </span>
        </div>
      </div>
    </div>
  );

  const expandedPanel = (
    <div className={panelClassName}>
      <div className="border-b border-slate-200 px-5 pb-4 pt-5 dark:border-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-200">
              Syllabus
            </p>
            <div className="space-y-2">
              <h2 className="text-base font-semibold tracking-tight text-slate-950 dark:text-white">
                {subjectName}
              </h2>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Choose the subtopics this session should draw from, then
                generate a question when you are ready to write.
              </p>
            </div>
          </div>

          <div className="shrink-0">{headerAction}</div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {selectedSubtopicIds.size} selected
          </span>
          <button
            className="text-sm font-semibold text-slate-700 transition hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:text-sky-200"
            disabled={selectedSubtopicIds.size === 0}
            onClick={onClearSelection}
            type="button"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-5 pt-4">
        <div className="space-y-3">
          {modules.map((module, index) => {
            const moduleSubtopicIds = getModuleSubtopicIds(module);
            const moduleSelectionState = getSelectionState(
              moduleSubtopicIds,
              selectedSubtopicIds,
            );
            const isModuleExpanded = expandedModuleIds.includes(module.id);

            return (
              <ModuleSection
                key={module.id}
                checked={moduleSelectionState.checked}
                expanded={isModuleExpanded}
                indeterminate={moduleSelectionState.indeterminate}
                isFirst={index === 0}
                module={module}
                onToggleExpand={() => onToggleExpandedModule(module.id)}
                onToggleSelection={() => onToggleModuleSelection(module.id)}
              >
                {isModuleExpanded ? (
                  <div className="ml-3 mt-3 space-y-2 border-l border-slate-200 pl-3 dark:border-slate-800">
                    {module.topics.map((topic) => {
                      const topicSubtopicIds = getTopicSubtopicIds(topic);
                      const topicSelectionState = getSelectionState(
                        topicSubtopicIds,
                        selectedSubtopicIds,
                      );
                      const isTopicExpanded = expandedTopicIds.includes(topic.id);

                      return (
                        <TopicRow
                          key={topic.id}
                          checked={topicSelectionState.checked}
                          expanded={isTopicExpanded}
                          indeterminate={topicSelectionState.indeterminate}
                          onToggleExpand={() => onToggleExpandedTopic(topic.id)}
                          onToggleSelection={() => onToggleTopicSelection(topic.id)}
                          topic={topic}
                        >
                          {isTopicExpanded ? (
                            <div className="ml-4 mt-2 space-y-1.5 border-l border-slate-200 pl-3 dark:border-slate-800">
                              {topic.subtopics.map((subtopic) => (
                                <SubtopicItem
                                  key={subtopic.id}
                                  checked={selectedSubtopicIds.has(subtopic.id)}
                                  onToggle={() =>
                                    onToggleSubtopicSelection(subtopic.id)
                                  }
                                  subtopic={subtopic}
                                />
                              ))}
                            </div>
                          ) : null}
                        </TopicRow>
                      );
                    })}
                  </div>
                ) : null}
              </ModuleSection>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <aside
      className={`relative overflow-hidden ${asideClassName} ${className ?? ""}`}
    >
      <div
        aria-hidden={!isCollapsed}
        className={`absolute inset-0 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${
          isCollapsed
            ? "translate-x-0 opacity-100"
            : "-translate-x-5 opacity-0 pointer-events-none"
        }`}
        inert={!isCollapsed}
      >
        {collapsedRail}
      </div>

      <div
        aria-hidden={isCollapsed}
        className={`absolute inset-0 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${
          isCollapsed
            ? "-translate-x-5 opacity-0 pointer-events-none"
            : "translate-x-0 opacity-100"
        }`}
        inert={isCollapsed}
      >
        {expandedPanel}
      </div>
    </aside>
  );
}

type ModuleSectionProps = {
  module: PracticeModule;
  checked: boolean;
  indeterminate: boolean;
  expanded: boolean;
  isFirst: boolean;
  onToggleSelection: () => void;
  onToggleExpand: () => void;
  children: ReactNode;
};

function ModuleSection({
  module,
  checked,
  indeterminate,
  expanded,
  isFirst,
  onToggleSelection,
  onToggleExpand,
  children,
}: ModuleSectionProps) {
  const isActive = checked || indeterminate;

  return (
    <section
      className={`${isFirst ? "" : "border-t border-slate-200 pt-3 dark:border-slate-800"}`}
    >
      <div
        className={`rounded-2xl border px-2.5 py-2.5 transition ${
          isActive
            ? "border-sky-200 bg-sky-50/70 shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10"
            : "border-transparent bg-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/60"
        }`}
      >
        <div className="flex items-start gap-2">
          <ExpandButton
            expanded={expanded}
            label={module.name}
            onToggle={onToggleExpand}
          />
          <StyledCheckbox
            checked={checked}
            indeterminate={indeterminate}
            label={`Select ${module.name}`}
            onToggle={onToggleSelection}
          />
        <button
          className="min-w-0 flex-1 text-left"
          onMouseDown={preventPointerFocus}
          onClick={onToggleSelection}
          type="button"
        >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {module.label}
            </p>
            <p className="mt-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              {module.name}
            </p>
          </button>
        </div>
      </div>

      {children}
    </section>
  );
}

type TopicRowProps = {
  topic: PracticeTopic;
  checked: boolean;
  indeterminate: boolean;
  expanded: boolean;
  onToggleSelection: () => void;
  onToggleExpand: () => void;
  children: ReactNode;
};

function TopicRow({
  topic,
  checked,
  indeterminate,
  expanded,
  onToggleSelection,
  onToggleExpand,
  children,
}: TopicRowProps) {
  const isActive = checked || indeterminate;

  return (
    <div className="space-y-1.5">
      <div
        className={`rounded-xl border px-2 py-2 transition ${
          isActive
            ? "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/90"
            : "border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:border-slate-800 dark:hover:bg-slate-900/70"
        }`}
      >
        <div className="flex items-start gap-2">
          <ExpandButton
            expanded={expanded}
            label={topic.name}
            onToggle={onToggleExpand}
          />
          <StyledCheckbox
            checked={checked}
            indeterminate={indeterminate}
            label={`Select ${topic.name}`}
            onToggle={onToggleSelection}
          />
          <button
            className="min-w-0 flex-1 pt-0.5 text-left"
            onMouseDown={preventPointerFocus}
            onClick={onToggleSelection}
            type="button"
          >
            <p className="text-sm font-medium tracking-tight text-slate-700 dark:text-slate-200">
              {topic.name}
            </p>
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

type SubtopicItemProps = {
  subtopic: PracticeSubtopic;
  checked: boolean;
  onToggle: () => void;
};

function SubtopicItem({ subtopic, checked, onToggle }: SubtopicItemProps) {
  return (
    <div
      className={`rounded-xl border px-2 py-2 transition ${
        checked
          ? "border-sky-200 bg-sky-50/80 shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10"
          : "border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:border-slate-800 dark:hover:bg-slate-900/70"
      }`}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="block h-7 w-7 shrink-0" />
        <StyledCheckbox
          checked={checked}
          indeterminate={false}
          label={`Select ${subtopic.name}`}
          onToggle={onToggle}
        />
        <button
          className="min-w-0 flex-1 text-left"
          onMouseDown={preventPointerFocus}
          onClick={onToggle}
          type="button"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {subtopic.code}
          </p>
          <p className="mt-1 text-sm font-medium leading-5 tracking-tight text-slate-700 dark:text-slate-200">
            {subtopic.name}
          </p>
        </button>
      </div>
    </div>
  );
}

type ExpandButtonProps = {
  expanded: boolean;
  label: string;
  onToggle: () => void;
};

function ExpandButton({ expanded, label, onToggle }: ExpandButtonProps) {
  return (
    <button
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      onMouseDown={preventPointerFocus}
      onClick={onToggle}
      type="button"
    >
      <ChevronIcon
        className={`h-4 w-4 transition duration-200 ${expanded ? "rotate-90" : ""}`}
      />
    </button>
  );
}

type StyledCheckboxProps = {
  checked: boolean;
  indeterminate: boolean;
  label: string;
  onToggle: () => void;
};

function StyledCheckbox({
  checked,
  indeterminate,
  label,
  onToggle,
}: StyledCheckboxProps) {
  const isActive = checked || indeterminate;

  return (
    <button
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      className="mt-1 inline-flex shrink-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70"
      onClick={onToggle}
      onMouseDown={preventPointerFocus}
      role="checkbox"
      type="button"
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-md border transition ${
          isActive
            ? "border-sky-500 bg-sky-600 text-white shadow-sm dark:border-sky-400 dark:bg-sky-500"
            : "border-slate-300 bg-slate-100 text-transparent hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-500"
        }`}
      >
        {indeterminate ? (
          <MinusIcon className="h-3 w-3" />
        ) : checked ? (
          <CheckIcon className="h-3 w-3" />
        ) : null}
      </span>
    </button>
  );
}

function getTopicSubtopicIds(topic: PracticeTopic) {
  return topic.subtopics.map((subtopic) => subtopic.id);
}

function getModuleSubtopicIds(module: PracticeModule) {
  return module.topics.flatMap((topic) => getTopicSubtopicIds(topic));
}

function getSelectionState(
  selectedIds: number[],
  selectedSubtopicIds: ReadonlySet<number>,
) {
  const selectedCount = selectedIds.filter((id) =>
    selectedSubtopicIds.has(id),
  ).length;

  return {
    checked: selectedIds.length > 0 && selectedCount === selectedIds.length,
    indeterminate: selectedCount > 0 && selectedCount < selectedIds.length,
  };
}

function preventPointerFocus(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault();
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m9.25 6.75 5.5 5.25-5.5 5.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5.75 12.25 4 4 8.5-8.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6.75 12h10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
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

function PanelCollapseIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7.75 6.75h5.5m-5.5 5.25h5.5m-5.5 5.25h5.5m8-12.25v14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m17 12-2.75 2.75m2.75-2.75-2.75-2.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PanelExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 5v14m4-12.25 5.25 5.25L11 17.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
