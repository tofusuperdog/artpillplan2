import type { Medication } from "./types";

export function medicationDisplayName(medication: Pick<Medication, "name" | "brand_name">) {
  return medication.brand_name?.trim() || medication.name;
}

export function medicationGenericName(medication: Pick<Medication, "generic_name">) {
  return medication.generic_name?.trim() || "";
}

export function medicationSubtitle(
  medication: Pick<Medication, "name" | "brand_name" | "generic_name">,
) {
  const genericName = medicationGenericName(medication);
  const displayName = medicationDisplayName(medication);
  return genericName && genericName.toLowerCase() !== displayName.toLowerCase() ? genericName : "";
}
