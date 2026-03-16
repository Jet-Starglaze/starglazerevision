"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  PracticeModule,
  PracticeSubtopic,
  PracticeTopic,
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

export default function PracticeWorkspace({
  subjectName,
  subjectSlug,
  modules,
}: PracticeWorkspaceProps) {
  const [selectedSubtopicIds, setSelectedSubtopicIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>(
    modules.map((module) => module.id),
  );
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>(
    modules.flatMap((module) => module.topics.map((topic) => topic.id)),
  );
  const [activeMobilePane, setActiveMobilePane] = useState<
    "syllabus" | "session" | null
  >(null);

  const selectedSubtopicIdSet = useMemo(() => {
    return new Set(selectedSubtopicIds);
  }, [selectedSubtopicIds]);

  const practiceSessionKey = useMemo(() => {
    return [...selectedSubtopicIds].sort().join("|");
  }, [selectedSubtopicIds]);

  const selectedSubtopics = useMemo<SelectedPracticeSubtopic[]>(() => {
    return modules.flatMap((module) =>
      module.topics.flatMap((topic) =>
        topic.subtopics
          .filter((subtopic) => selectedSubtopicIdSet.has(subtopic.id))
          .map((subtopic) => ({
            ...subtopic,
            moduleLabel: module.label,
            moduleName: module.name,
            topicName: topic.name,
          })),
      ),
    );
  }, [modules, selectedSubtopicIdSet]);

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

  function toggleExpandedModule(moduleId: string) {
    setExpandedModuleIds((currentIds) => {
      return currentIds.includes(moduleId)
        ? currentIds.filter((id) => id !== moduleId)
        : [...currentIds, moduleId];
    });
  }

  function toggleExpandedTopic(topicId: string) {
    setExpandedTopicIds((currentIds) => {
      return currentIds.includes(topicId)
        ? currentIds.filter((id) => id !== topicId)
        : [...currentIds, topicId];
    });
  }

  function toggleSubtopicSelection(subtopicId: string) {
    setSelectedSubtopicIds((currentIds) => {
      return currentIds.includes(subtopicId)
        ? currentIds.filter((id) => id !== subtopicId)
        : [...currentIds, subtopicId];
    });
  }

  function toggleTopicSelection(topic: PracticeTopic) {
    const descendantIds = getTopicSubtopicIds(topic);

    setSelectedSubtopicIds((currentIds) => {
      const currentSet = new Set(currentIds);
      const hasEveryDescendant = descendantIds.every((id) => currentSet.has(id));

      if (hasEveryDescendant) {
        return currentIds.filter((id) => !descendantIds.includes(id));
      }

      return [...new Set([...currentIds, ...descendantIds])];
    });
  }

  function toggleModuleSelection(module: PracticeModule) {
    const descendantIds = getModuleSubtopicIds(module);

    setSelectedSubtopicIds((currentIds) => {
      const currentSet = new Set(currentIds);
      const hasEveryDescendant = descendantIds.every((id) => currentSet.has(id));

      if (hasEveryDescendant) {
        return currentIds.filter((id) => !descendantIds.includes(id));
      }

      return [...new Set([...currentIds, ...descendantIds])];
    });
  }

  function clearSelection() {
    setSelectedSubtopicIds([]);
  }

  return (
    <div className="relative min-h-[calc(100dvh-8rem)] border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 sm:min-h-[calc(100dvh-7rem)] xl:min-h-[calc(100dvh-5.5rem)]">
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-950/55 transition duration-300 xl:hidden ${
          activeMobilePane ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setActiveMobilePane(null)}
      />

      <div className="grid min-h-[calc(100dvh-8rem)] w-full xl:min-h-[calc(100dvh-5.5rem)] xl:grid-cols-[288px_minmax(0,1fr)]">
        <div className="hidden xl:block">
          <PracticeSidebar
            className="h-full min-h-[calc(100dvh-5.5rem)]"
            expandedModuleIds={expandedModuleIds}
            expandedTopicIds={expandedTopicIds}
            modules={modules}
            onClearSelection={clearSelection}
            onToggleExpandedModule={toggleExpandedModule}
            onToggleExpandedTopic={toggleExpandedTopic}
            onToggleModuleSelection={toggleModuleSelection}
            onToggleSubtopicSelection={toggleSubtopicSelection}
            onToggleTopicSelection={toggleTopicSelection}
            selectedSubtopicIdSet={selectedSubtopicIdSet}
            subjectName={subjectName}
          />
        </div>

        <PracticeWorkspaceShell
          key={practiceSessionKey}
          isSessionPanelOpen={activeMobilePane === "session"}
          onCloseSessionPanel={() => setActiveMobilePane(null)}
          onOpenSessionPanel={() => setActiveMobilePane("session")}
          onOpenSidebar={() => setActiveMobilePane("syllabus")}
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
          selectedSubtopicIdSet={selectedSubtopicIdSet}
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

function getTopicSubtopicIds(topic: PracticeTopic) {
  return topic.subtopics.map((subtopic) => subtopic.id);
}

function getModuleSubtopicIds(module: PracticeModule) {
  return module.topics.flatMap((topic) => getTopicSubtopicIds(topic));
}
