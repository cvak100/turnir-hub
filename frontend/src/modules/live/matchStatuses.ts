/** Match status codes from tournaments templates (match_live / dashboard). */

export const LIVE_MATCH_STATUS_CODES = new Set([
  "live",
  "match_warmup",
  "match_in_progress",
  "match_first_half",
  "match_halftime",
  "match_second_half",
  "match_extra_time",
  "match_penalties",
]);

export const FINISHED_MATCH_STATUS_CODES = new Set([
  "finished",
  "match_finished",
  "match_abandoned",
]);

export const SCHEDULED_MATCH_STATUS_CODES = new Set([
  "scheduled",
  "match_scheduled",
  "match_not_started",
  "postponed",
]);

/** Quick buttons — same set as match_live.html + extra time. */
export const LIVE_QUICK_STATUS_CODES = [
  "match_first_half",
  "match_halftime",
  "match_second_half",
  "match_extra_time",
  "match_penalties",
  "match_finished",
] as const;

export function isLiveMatchStatus(code: string | null | undefined): boolean {
  return Boolean(code && LIVE_MATCH_STATUS_CODES.has(code));
}

export function isFinishedMatchStatus(code: string | null | undefined): boolean {
  return Boolean(code && FINISHED_MATCH_STATUS_CODES.has(code));
}

export function isScheduledMatchStatus(code: string | null | undefined): boolean {
  return Boolean(code && SCHEDULED_MATCH_STATUS_CODES.has(code));
}

export function eventHalfForStatus(code: string | null | undefined): string {
  const mapping: Record<string, string> = {
    match_first_half: "1",
    match_halftime: "1",
    match_second_half: "2",
    match_extra_time: "ET1",
    match_penalties: "penalties",
    match_in_progress: "1",
    live: "1",
  };
  return mapping[code || ""] || "1";
}

/** Max minutes for the current period clock (per half / ET), from rules. */
export function periodMaxMinutes(opts: {
  half: string;
  halfDurationMinutes?: number | null;
  matchDurationMinutes?: number | null;
  numberOfHalves?: number | null;
  extraTimeMinutes?: number | null;
}): number | null {
  const { half } = opts;
  if (half === "penalties") return null;

  if (half.startsWith("ET")) {
    const et = opts.extraTimeMinutes;
    if (et != null && et > 0) return Math.max(1, Math.ceil(et / 2));
  }

  if (opts.halfDurationMinutes != null && opts.halfDurationMinutes > 0) {
    return opts.halfDurationMinutes;
  }

  const total = opts.matchDurationMinutes;
  if (total != null && total > 0) {
    const halves =
      opts.numberOfHalves != null && opts.numberOfHalves > 0
        ? opts.numberOfHalves
        : 2;
    return Math.max(1, Math.floor(total / halves));
  }

  return null;
}

export function halfDisplayLabel(half: string | null | undefined): string {
  switch (half) {
    case "1":
      return "1. polčas";
    case "2":
      return "2. polčas";
    case "ET1":
      return "Podaljški";
    case "ET2":
      return "Podaljški 2";
    case "penalties":
      return "Penali";
    default:
      return half || "—";
  }
}

const HALF_SORT_ORDER: Record<string, number> = {
  "1": 1,
  "2": 2,
  ET1: 3,
  ET2: 4,
  penalties: 5,
};

export function halfSortKey(half: string | null | undefined): number {
  return HALF_SORT_ORDER[half || ""] ?? 50;
}

/** Match-clock minute for an event: period timer + offset of previous periods. */
export function matchMinuteFromPeriod(opts: {
  half: string;
  periodMinute: number;
  halfDurationMinutes?: number | null;
  matchDurationMinutes?: number | null;
  numberOfHalves?: number | null;
  extraTimeMinutes?: number | null;
}): number {
  const halfLen =
    periodMaxMinutes({
      half: "1",
      halfDurationMinutes: opts.halfDurationMinutes,
      matchDurationMinutes: opts.matchDurationMinutes,
      numberOfHalves: opts.numberOfHalves,
    }) ?? 0;
  const matchLen =
    opts.matchDurationMinutes != null && opts.matchDurationMinutes > 0
      ? opts.matchDurationMinutes
      : halfLen * (opts.numberOfHalves != null && opts.numberOfHalves > 0
          ? opts.numberOfHalves
          : 2);
  const etHalf =
    periodMaxMinutes({
      half: "ET1",
      halfDurationMinutes: opts.halfDurationMinutes,
      matchDurationMinutes: opts.matchDurationMinutes,
      numberOfHalves: opts.numberOfHalves,
      extraTimeMinutes: opts.extraTimeMinutes,
    }) ?? 0;

  let offset = 0;
  if (opts.half === "2") offset = halfLen;
  else if (opts.half === "ET1") offset = matchLen;
  else if (opts.half === "ET2") offset = matchLen + etHalf;

  return offset + Math.max(1, opts.periodMinute);
}
