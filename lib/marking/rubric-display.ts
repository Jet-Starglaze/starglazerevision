const rubricPointDisplayOverrides: Record<string, string> = {
  "this forms a boundary layer":
    "Water vapour accumulates near the leaf surface, forming a boundary layer.",
};

export function formatRubricPointDisplayText(pointText: string) {
  const trimmedPointText = pointText.trim();
  const overrideText =
    rubricPointDisplayOverrides[normalizeRubricPointText(trimmedPointText)];

  return overrideText ?? trimmedPointText;
}

export function buildRubricNextStepInstruction({
  pointText,
  status,
}: {
  pointText: string;
  status: "absent" | "partial";
}) {
  const displayText = ensureSentenceEnding(formatRubricPointDisplayText(pointText));
  const instructionPrefix =
    status === "partial" ? "Sharpen this point:" : "Add this missing point:";

  return `${instructionPrefix} ${displayText}`;
}

function normalizeRubricPointText(pointText: string) {
  return pointText.trim().toLowerCase().replace(/\s+/g, " ");
}

function ensureSentenceEnding(value: string) {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}
