export function formatPersonName(person: {
  first_name?: string;
  last_name?: string;
  nickname?: string;
} | null | undefined): string {
  if (!person) return "—";
  const full = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  return person.nickname || "—";
}

export function toOptionalNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toNumberOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
