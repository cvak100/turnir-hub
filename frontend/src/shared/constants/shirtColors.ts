export type ShirtColor = {
  code: string;
  label: string;
  hex: string;
};

/** Fixed palette for team kit colours (stored as code in shirt_top / shirt_bottom). */
export const SHIRT_COLORS: ShirtColor[] = [
  { code: "white", label: "Bela", hex: "#f4f4f0" },
  { code: "black", label: "Črna", hex: "#1a1a1a" },
  { code: "red", label: "Rdeča", hex: "#c1121f" },
  { code: "blue", label: "Modra", hex: "#2563eb" },
  { code: "navy", label: "Temno modra", hex: "#1e3a5f" },
  { code: "green", label: "Zelena", hex: "#15803d" },
  { code: "yellow", label: "Rumena", hex: "#eab308" },
  { code: "orange", label: "Oranžna", hex: "#ea580c" },
  { code: "purple", label: "Vijolična", hex: "#7c3aed" },
  { code: "pink", label: "Roza", hex: "#db2777" },
];

export function getShirtColor(code: string | null | undefined): ShirtColor | null {
  if (!code) return null;
  return SHIRT_COLORS.find((c) => c.code === code) ?? null;
}

export function shirtColorLabel(code: string | null | undefined): string {
  return getShirtColor(code)?.label ?? (code || "—");
}
