"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
  onToggleExpandedModule,
  onToggleExpandedTopic,
  onToggleModuleSelection,
  onToggleTopicSelection,
  onToggleSubtopicSelection,
  onClearSelection,
  className,
  onClose,
}: PracticeSidebarProps) {
  return (
    <aside className={`${asideClassName} ${className ?? ""}`}>
      <div className={panelClassName}>
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 dark:text-sky-200">
              Syllabus
            </p>
            <h2 className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 dark:text-white">
              {subjectName}
            </h2>
            <p className="mt-1.5 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Choose the parts of the syllabus you want this session to draw
              from.
            </p>
          </div>

          {onClose ? (
            <button
              aria-label="Close syllabus"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-200"
              onClick={onClose}
              type="button"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-b border-slate-200 px-4 pb-3 text-sm dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">
            {selectedSubtopicIds.size} selected
          </span>
          <button
            className="font-semibold text-slate-700 transition hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-200"
            onClick={onClearSelection}
            type="button"
          >
            Clear all
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
          <div className="space-y-2">
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
                    <div className="ml-2 mt-2 space-y-1 border-l border-slate-200 pl-2 dark:border-slate-800">
                      {module.topics.map((topic) => {
                        const topicSubtopicIds = getTopicSubtopicIds(topic);
                        const topicSelectionState = getSelectionState(
                          topicSubtopicIds,
                          selectedSubtopicIds,
                        );
                        const isTopicExpanded = expandedTopicIds.includes(
                          topic.id,
                        );

                        return (
                          <TopicRow
                            key={topic.id}
                            checked={topicSelectionState.checked}
                            expanded={isTopicExpanded}
                            indeterminate={topicSelectionState.indeterminate}
                            onToggleExpand={() =>
                              onToggleExpandedTopic(topic.id)
                            }
                            onToggleSelection={() =>
                              onToggleTopicSelection(topic.id)
                            }
                            topic={topic}
                          >
                            {isTopicExpanded ? (
                              <div className="ml-3 mt-1 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
                                {topic.subtopics.map((subtopic) => (
                                  <SubtopicItem
                                    key={subtopic.id}
                                    checked={selectedSubtopicIds.has(
                                      subtopic.id,
                                    )}
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
  return (
    <section
      className={`${isFirst ? "" : "border-t border-slate-200 pt-2 dark:border-slate-800"}`}
    >
      <div className="flex items-start gap-1 px-0.5">
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
          onClick={onToggleSelection}
          type="button"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {module.label}
          </p>
          <p className="mt-0.5 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
            {module.name}
          </p>
        </button>
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
    <div className="space-y-0.5">
      <div
        className={`rounded-xl px-1 py-1 transition ${
          isActive
            ? "bg-slate-100 dark:bg-slate-800/80"
            : "hover:bg-slate-100 dark:hover:bg-slate-800/60"
        }`}
      >
        <div className="flex items-start gap-1">
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
    <div className="rounded-lg px-1 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800/60">
      <div className="flex items-start gap-1">
        <span aria-hidden="true" className="block h-7 w-7 shrink-0" />
        <StyledCheckbox
          checked={checked}
          indeterminate={false}
          label={`Select ${subtopic.name}`}
          onToggle={onToggle}
        />
        <button
          className="min-w-0 flex-1 text-left"
          onClick={onToggle}
          type="button"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {subtopic.code}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-5 tracking-tight text-slate-700 dark:text-slate-200">
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
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = checked || indeterminate;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className="mt-1 inline-flex shrink-0 cursor-pointer">
      <input
        ref={inputRef}
        aria-label={label}
        checked={checked}
        className="peer sr-only"
        onChange={onToggle}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-md border transition peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500/70 ${
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
    </label>
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
