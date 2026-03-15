import SubjectsLoadingShell from "@/components/subjects-loading-shell";

export default function SubtopicLoading() {
  return (
    <SubjectsLoadingShell
      cardCount={1}
      cardLayout="stack"
      showDetailPanels
    />
  );
}
