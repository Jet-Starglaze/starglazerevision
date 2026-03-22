const requiredAreaLabelOverrides: Record<string, string> = {
  hydrogencarbonate_pathway: "Hydrogencarbonate transport in blood",
  lung_release: "Carbon dioxide release in the lungs",
  fluid_name: "Definition of tissue fluid",
  origin: "Origin of tissue fluid",
  dissolved_transport: "Dissolved transport in plasma",
  carbamino_transport: "Carbamino transport",
};

export function formatRequiredAreaLabel(requiredArea: string) {
  const normalizedRequiredArea = requiredArea.trim().toLowerCase();

  if (normalizedRequiredArea.length === 0) {
    return "Unknown focus area";
  }

  const overrideLabel = requiredAreaLabelOverrides[normalizedRequiredArea];

  if (overrideLabel) {
    return overrideLabel;
  }

  return normalizedRequiredArea
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
