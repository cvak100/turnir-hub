/** Icons aligned with tournaments/app/templates (dashboard + match_live). */
export const EVENT_ICONS: Record<string, string> = {
  goal: "⚽",
  own_goal: "🥅",
  assist: "👟",
  yellow_card: "🟨",
  red_card: "🟥",
  second_yellow: "🟨🟥",
  substitution_in: "🔁⬆️",
  substitution_out: "🔁⬇️",
  penalty_scored: "✅",
  penalty_missed: "❌",
  injury: "🩹",
  var: "📺",
  other: "•",
};

export function eventIcon(code: string | undefined | null): string {
  if (!code) return "";
  return EVENT_ICONS[code] ?? "•";
}

export function eventLabelWithIcon(
  code: string | undefined | null,
  name: string,
): string {
  const icon = eventIcon(code);
  return icon ? `${icon} ${name}` : name;
}
