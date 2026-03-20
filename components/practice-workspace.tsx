"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  PracticeModule,
  PracticeSubtopic,
} from "@/lib/mock-biology-practice";
import PracticeSidebar from "@/components/practice/practice-sidebar";
import PracticeWorkspaceShell from "@/components/practice/practice-workspace-shell";

type PracticeWorkspaceProps = {
  subjectName: string;
  subjectSlug: string;
  modules: PracticeModule[];
};

type SelectedPracticeSubtopic = PracticeSubtopic & {
  moduleLabel: string;
  moduleName: string;
  topicName: string;
};

type PracticeSelectionTree = {
  moduleSubtopicIds: Map<number, number[]>;
  topicSubtopicIds: Map<number, number[]>;
};

export default function PracticeWorkspace({
  subjectName,
  subjectSlug,
  modules,
}: PracticeWorkspaceProps) {
  const [selectedSubtopicIds, setSelectedSubtopicIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedModuleIds, setExpandedModuleIds] = useState<number[]>(
    modules.map((module) => module.id),
  );
  const [expandedTopicIds, setExpandedTopicIds] = useState<number[]>(
    modules.flatMap((module) => module.topics.map((topic) => topic.id)),
  );
  const [activeMobilePane, setActiveMobilePane] = useState<
    "syllabus" | "session" | null
  >(null);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);

  const selectionTree = useMemo(() => {
    return buildPracticeSelectionTree(modules);
  }, [modules]);

  const selectedSubtopicIdList = useMemo(() => {
    return Array.from(selectedSubtopicIds);
  }, [selectedSubtopicIds]);

  const selectionKey = useMemo(() => {
    return [...selectedSubtopicIdList].sort((left, right) => left - right).join("|");
  }, [selectedSubtopicIdList]);

  const selectedSubtopics = useMemo<SelectedPracticeSubtopic[]>(() => {
    return modules.flatMap((module) =>
      module.topics.flatMap((topic) =>
        topic.subtopics
          .filter((subtopic) => selectedSubtopicIds.has(subtopic.id))
          .map((subtopic) => ({
            ...subtopic,
            moduleLabel: module.label,
            moduleName: module.name,
            topicName: topic.name,
          })),
      ),
    );
  }, [modules, selectedSubtopicIds]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMobilePane(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!activeMobilePane) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeMobilePane]);

  function toggleExpandedModule(moduleId: number) {
    setExpandedModuleIds((currentIds) => {
      return currentIds.includes(moduleId)
        ? currentIds.filter((id) => id !== moduleId)
        : [...currentIds, moduleId];
    });
  }

  function toggleExpandedTopic(topicId: number) {
    setExpandedTopicIds((currentIds) => {
      return currentIds.includes(topicId)
        ? currentIds.filter((id) => id !== topicId)
        : [...currentIds, topicId];
    });
  }

  function toggleSubtopicSelection(subtopicId: number) {
    setSelectedSubtopicIds((currentIds) => {
      return toggleSingleSubtopicSelection(currentIds, subtopicId);
    });
  }

  function toggleTopicSelection(topicId: number) {
    setSelectedSubtopicIds((currentIds) => {
      return toggleBranchSelection(
        currentIds,
        selectionTree.topicSubtopicIds.get(topicId) ?? [],
      );
    });
  }

  function toggleModuleSelection(moduleId: number) {
    setSelectedSubtopicIds((currentIds) => {
      return toggleBranchSelection(
        currentIds,
        selectionTree.moduleSubtopicIds.get(moduleId) ?? [],
      );
    });
  }

  function clearSelection() {
    setSelectedSubtopicIds(() => new Set());
  }

  const desktopGridClass = isDesktopSidebarCollapsed
    ? "xl:grid-cols-[4.75rem_minmax(0,1fr)]"
    : "xl:grid-cols-[320px_minmax(0,1fr)]";

  return (
    <div className="relative min-h-[calc(100dvh-8rem)] border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:min-h-[calc(100dvh-7rem)] xl:h-[calc(100dvh-5.5rem)] xl:min-h-0 xl:overflow-hidden">
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-950/55 transition duration-300 xl:hidden ${
          activeMobilePane ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setActiveMobilePane(null)}
      />

      <div
        className={`grid min-h-[calc(100dvh-8rem)] w-full xl:h-full xl:min-h-0 ${desktopGridClass}`}
      >
        <div className="hidden xl:block xl:min-h-0">
          <PracticeSidebar
            className="h-full"
            expandedModuleIds={expandedModuleIds}
            expandedTopicIds={expandedTopicIds}
            isCollapsed={isDesktopSidebarCollapsed}
            modules={modules}
            onClearSelection={clearSelection}
            onToggleCollapsed={() =>
              setIsDesktopSidebarCollapsed((currentValue) => !currentValue)
            }
            onToggleExpandedModule={toggleExpandedModule}
            onToggleExpandedTopic={toggleExpandedTopic}
            onToggleModuleSelection={toggleModuleSelection}
            onToggleSubtopicSelection={toggleSubtopicSelection}
            onToggleTopicSelection={toggleTopicSelection}
            selectedSubtopicIds={selectedSubtopicIds}
            subjectName={subjectName}
          />
        </div>

        <PracticeWorkspaceShell
          isSessionPanelOpen={activeMobilePane === "session"}
          onCloseSessionPanel={() => setActiveMobilePane(null)}
          onOpenSessionPanel={() => setActiveMobilePane("session")}
          onOpenSidebar={() => setActiveMobilePane("syllabus")}
          selectionKey={selectionKey}
          selectedSubtopicIds={selectedSubtopicIdList}
          selectedSubtopics={selectedSubtopics}
          subjectName={subjectName}
          subjectSlug={subjectSlug}
        />
      </div>

      <MobileSidebarDrawer
        isOpen={activeMobilePane === "syllabus"}
        onClose={() => setActiveMobilePane(null)}
      >
        <PracticeSidebar
          expandedModuleIds={expandedModuleIds}
          expandedTopicIds={expandedTopicIds}
          modules={modules}
          onClearSelection={clearSelection}
          onClose={() => setActiveMobilePane(null)}
          onToggleExpandedModule={toggleExpandedModule}
          onToggleExpandedTopic={toggleExpandedTopic}
          onToggleModuleSelection={toggleModuleSelection}
          onToggleSubtopicSelection={toggleSubtopicSelection}
          onToggleTopicSelection={toggleTopicSelection}
          selectedSubtopicIds={selectedSubtopicIds}
          subjectName={subjectName}
        />
      </MobileSidebarDrawer>
    </div>
  );
}

type MobileSidebarDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

function MobileSidebarDrawer({
  isOpen,
  onClose,
  children,
}: MobileSidebarDrawerProps) {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-full max-w-sm transition-transform duration-300 xl:hidden ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-full overflow-y-auto">
        {children}
        <button
          aria-label="Close syllabus"
          className="sr-only"
          onClick={onClose}
          type="button"
        />
      </div>
    </div>
  );
}

function buildPracticeSelectionTree(
  modules: PracticeModule[],
): PracticeSelectionTree {
  const moduleSubtopicIds = new Map<number, number[]>();
  const topicSubtopicIds = new Map<number, number[]>();

  modules.forEach((module) => {
    const nextModuleSubtopicIds: number[] = [];

    module.topics.forEach((topic) => {
      const nextTopicSubtopicIds = topic.subtopics.map((subtopic) => subtopic.id);
      topicSubtopicIds.set(topic.id, nextTopicSubtopicIds);
      nextModuleSubtopicIds.push(...nextTopicSubtopicIds);
    });

    moduleSubtopicIds.set(module.id, nextModuleSubtopicIds);
  });

  return {
    moduleSubtopicIds,
    topicSubtopicIds,
  };
}

function toggleSingleSubtopicSelection(
  currentIds: Set<number>,
  subtopicId: number,
) {
  const nextIds = new Set(currentIds);

  if (nextIds.has(subtopicId)) {
    nextIds.delete(subtopicId);
  } else {
    nextIds.add(subtopicId);
  }

  return nextIds;
}

function toggleBranchSelection(
  currentIds: Set<number>,
  descendantIds: readonly number[],
) {
  if (descendantIds.length === 0) {
    return currentIds;
  }

  const nextIds = new Set(currentIds);
  const isFullySelected = descendantIds.every((id) => nextIds.has(id));

  descendantIds.forEach((id) => {
    if (isFullySelected) {
      nextIds.delete(id);
    } else {
      nextIds.add(id);
    }
  });

  return nextIds;
}
