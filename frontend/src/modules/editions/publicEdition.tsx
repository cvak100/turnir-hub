import { Link } from "react-router-dom";
import type {
  GroupListItem,
  MatchListItem,
  PhaseListItem,
} from "@/modules/matches/services/matchService";
import type { PublicGroupTeamRow } from "@/modules/public/services/publicApi";

export function personLabel(p: {
  player?: {
    id?: number;
    person?: { first_name?: string; last_name?: string; nickname?: string };
  };
}): string {
  const person = p.player?.person;
  if (!person) return "—";
  const full = `${person.last_name ?? ""} ${person.first_name ?? ""}`.trim();
  return full || person.nickname || "—";
}

export function matchLabel(m: MatchListItem): string {
  const home = m.home_team_name ?? "TBD";
  const away = m.away_team_name ?? "TBD";
  if (m.home_score != null && m.away_score != null) {
    return `${home} ${m.home_score}:${m.away_score} ${away}`;
  }
  return `${home} – ${away}`;
}

export function sortGroupRows(rows: PublicGroupTeamRow[]): PublicGroupTeamRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdB !== gdA) return gdB - gdA;
    return b.goals_for - a.goals_for;
  });
}

export function isKnockoutPhaseType(code: string | null | undefined): boolean {
  const t = (code ?? "").toLowerCase();
  return t === "knockout" || t === "third_place" || t.includes("knock");
}

export function sortMatchesByDate(rows: MatchListItem[]): MatchListItem[] {
  return [...rows].sort((a, b) => {
    const da = a.match_date
      ? new Date(a.match_date).getTime()
      : Number.MAX_SAFE_INTEGER;
    const db = b.match_date
      ? new Date(b.match_date).getTime()
      : Number.MAX_SAFE_INTEGER;
    return da - db;
  });
}

export function buildGroupTables(
  groups: GroupListItem[],
  groupTeams: PublicGroupTeamRow[],
  phases: PhaseListItem[],
) {
  return [...groups]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((g) => {
      const phase = phases.find((p) => p.id === g.tournament_phase);
      return {
        group: g,
        phaseName:
          phase?.name ??
          groupTeams.find((r) => r.tournament_phase_group === g.id)?.phase_name,
        rows: sortGroupRows(
          groupTeams.filter((r) => r.tournament_phase_group === g.id),
        ),
      };
    })
    .filter((t) => t.rows.length > 0);
}

export function filterKnockoutMatches(
  matches: MatchListItem[],
  phases: PhaseListItem[],
): MatchListItem[] {
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  return matches.filter((m) => {
    const phase = phaseById.get(m.tournament_phase);
    const type = phase?.phase_type ?? m.phase_type;
    return isKnockoutPhaseType(type);
  });
}

export function formatMatchDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatMatchTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const m = /T(\d{2}:\d{2})/.exec(iso);
    return m ? m[1] : "—";
  }
  // Date-only (midnight UTC) → no meaningful kickoff time
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    !iso.includes("T")
  ) {
    return "—";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return "—";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function scoreCell(m: MatchListItem): string {
  if (m.home_score != null && m.away_score != null) {
    return `${m.home_score} : ${m.away_score}`;
  }
  return "–";
}

/** Group matches by phase (phase order), then by date within phase. */
export function groupMatchesByPhase(
  matches: MatchListItem[],
  phases: PhaseListItem[],
): { phaseId: number; phaseName: string; phaseOrder: number; matches: MatchListItem[] }[] {
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  const buckets = new Map<
    number,
    { phaseId: number; phaseName: string; phaseOrder: number; matches: MatchListItem[] }
  >();

  for (const m of sortMatchesByDate(matches)) {
    const phase = phaseById.get(m.tournament_phase);
    const phaseId = m.tournament_phase;
    const existing = buckets.get(phaseId);
    if (existing) {
      existing.matches.push(m);
    } else {
      buckets.set(phaseId, {
        phaseId,
        phaseName: phase?.name ?? m.phase_name ?? `Faza #${phaseId}`,
        phaseOrder: phase?.order ?? 999,
        matches: [m],
      });
    }
  }

  return [...buckets.values()].sort(
    (a, b) => a.phaseOrder - b.phaseOrder || a.phaseName.localeCompare(b.phaseName),
  );
}

/** Knockout matches grouped by round/phase. */
export function groupKnockoutByPhase(
  matches: MatchListItem[],
  phases: PhaseListItem[],
) {
  return groupMatchesByPhase(
    filterKnockoutMatches(matches, phases),
    phases,
  );
}

export function EditionPublicNav({ editionId }: { editionId: number }) {
  const base = `/editions/${editionId}`;
  return (
    <nav className="edition-public-nav" aria-label="Sekcije edicije">
      <Link to={`${base}/standings`}>Lestvica</Link>
      <Link to={`${base}/schedule`}>Razpored</Link>
      <Link to={`${base}/ekipe`}>Ekipe</Link>
      <Link to={`${base}/igralci`}>Igralci</Link>
      <Link to={`${base}/statistika`}>Statistika</Link>
      <Link to={base}>Dashboard</Link>
    </nav>
  );
}
