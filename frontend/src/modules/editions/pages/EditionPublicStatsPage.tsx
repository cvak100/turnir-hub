import { useMemo, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import type { MatchListItem } from "@/modules/matches/services/matchService";
import type { MatchEventListItem } from "@/modules/matches/services/matchService";
import type { TeamParticipationPlayerListItem } from "@/modules/players/services/playerService";
import {
  normalizeList,
  publicApi,
  type PublicGroupTeamRow,
} from "@/modules/public/services/publicApi";
import { EditionPublicNav, personLabel } from "../publicEdition.tsx";

const TOP = 4;

const GOAL_CODES = new Set(["goal", "penalty_scored"]);

type TeamAgg = {
  id: number;
  name: string;
  teamId: number | null;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
};

type StatRow = {
  href?: string;
  cells: ReactNode[];
};

function topN<T>(rows: T[], n: number): T[] {
  return rows.slice(0, n);
}

function buildTeamAggregates(opts: {
  players: TeamParticipationPlayerListItem[];
  matches: MatchListItem[];
  groupTeams: PublicGroupTeamRow[];
  participationNames: Map<number, string>;
  participationTeamIds: Map<number, number>;
}): TeamAgg[] {
  const map = new Map<number, TeamAgg>();

  function ensure(id: number, name?: string): TeamAgg {
    let row = map.get(id);
    if (!row) {
      row = {
        id,
        name: name || opts.participationNames.get(id) || `Ekipa #${id}`,
        teamId: opts.participationTeamIds.get(id) ?? null,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gf: 0,
        ga: 0,
        points: 0,
      };
      map.set(id, row);
    } else {
      if (name && row.name.startsWith("Ekipa #")) row.name = name;
      if (row.teamId == null) {
        row.teamId = opts.participationTeamIds.get(id) ?? null;
      }
    }
    return row;
  }

  for (const p of opts.players) {
    const name = p.team_name ?? p.participation_name ?? undefined;
    const row = ensure(p.team_participation, name ?? undefined);
    row.goals += p.goals ?? 0;
    row.assists += p.assists ?? 0;
    row.yellow += p.yellow_cards ?? 0;
    row.red += p.red_cards ?? 0;
  }

  for (const gt of opts.groupTeams) {
    const row = ensure(gt.team_participation, gt.participation_name);
    row.matches = Math.max(row.matches, gt.played);
    row.wins = Math.max(row.wins, gt.wins);
    row.draws = Math.max(row.draws, gt.draws);
    row.losses = Math.max(row.losses, gt.losses);
    row.gf = Math.max(row.gf, gt.goals_for);
    row.ga = Math.max(row.ga, gt.goals_against);
    row.points = Math.max(row.points, gt.points);
  }

  const hasGroupStats = opts.groupTeams.length > 0;
  if (!hasGroupStats) {
    for (const m of opts.matches) {
      if (m.home_score == null || m.away_score == null) continue;
      const homeId = m.home_team_participation;
      const awayId = m.away_team_participation;
      if (homeId == null || awayId == null) continue;
      const home = ensure(homeId, m.home_team_name ?? undefined);
      const away = ensure(awayId, m.away_team_name ?? undefined);
      home.matches += 1;
      away.matches += 1;
      home.gf += m.home_score;
      home.ga += m.away_score;
      away.gf += m.away_score;
      away.ga += m.home_score;
      if (m.home_score > m.away_score) {
        home.wins += 1;
        away.losses += 1;
        home.points += 3;
      } else if (m.home_score < m.away_score) {
        away.wins += 1;
        home.losses += 1;
        away.points += 3;
      } else {
        home.draws += 1;
        away.draws += 1;
        home.points += 1;
        away.points += 1;
      }
    }
  }

  return [...map.values()];
}

/** Longest streak of consecutive (by date) matches in which the player scored. */
function scoringStreaks(
  events: MatchEventListItem[],
  matches: MatchListItem[],
  players: TeamParticipationPlayerListItem[],
): { player: TeamParticipationPlayerListItem; streak: number }[] {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const scoredMatchIds = new Map<number, Set<number>>();

  for (const ev of events) {
    const code = ev.event_type?.code;
    if (!code || !GOAL_CODES.has(code) || ev.is_own_goal) continue;
    if (ev.player == null) continue;
    const match = matchById.get(ev.match);
    if (!match?.match_date) continue;
    let set = scoredMatchIds.get(ev.player);
    if (!set) {
      set = new Set();
      scoredMatchIds.set(ev.player, set);
    }
    set.add(ev.match);
  }

  const playerById = new Map(
    players.filter((p) => p.player?.id != null).map((p) => [p.player.id, p]),
  );

  const scoredMatchesSorted = [...matches]
    .filter((m) => m.match_date && m.home_score != null)
    .sort(
      (a, b) =>
        new Date(a.match_date!).getTime() - new Date(b.match_date!).getTime(),
    );

  const results: { player: TeamParticipationPlayerListItem; streak: number }[] =
    [];

  for (const [playerId, matchIds] of scoredMatchIds) {
    const player = playerById.get(playerId);
    if (!player) continue;
    let best = 0;
    let cur = 0;
    for (const m of scoredMatchesSorted) {
      if (matchIds.has(m.id)) {
        cur += 1;
        best = Math.max(best, cur);
      } else {
        // Only break streak if this match involved the player's team
        const part = player.team_participation;
        const involved =
          m.home_team_participation === part ||
          m.away_team_participation === part;
        if (involved) cur = 0;
      }
    }
    if (best > 0) results.push({ player, streak: best });
  }

  return results.sort((a, b) => b.streak - a.streak);
}

function StatTable({
  title,
  headers,
  rows,
  empty,
  onNavigate,
}: {
  title: string;
  headers: string[];
  rows: StatRow[];
  empty: string;
  onNavigate: (href: string) => void;
}) {
  function activate(href: string | undefined) {
    if (href) onNavigate(href);
  }

  function onKey(
    e: KeyboardEvent<HTMLTableRowElement>,
    href: string | undefined,
  ) {
    if (!href) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onNavigate(href);
    }
  }

  return (
    <div className="edition-stat-block">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <table className="data-table edition-public-table edition-stat-table">
          <thead>
            <tr>
              <th>#</th>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={
                  row.href ? "edition-public-table__row" : undefined
                }
                tabIndex={row.href ? 0 : undefined}
                role={row.href ? "link" : undefined}
                onClick={() => activate(row.href)}
                onKeyDown={(e) => onKey(e, row.href)}
              >
                <td>{i + 1}</td>
                {row.cells.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function EditionPublicStatsPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const navigate = useNavigate();

  const edition = useAsyncData(
    () => publicApi.getEdition(editionId),
    [editionId],
  );
  const players = useAsyncData(
    () => publicApi.listEditionPlayers(editionId),
    [editionId],
  );
  const teams = useAsyncData(
    () => publicApi.listParticipations(editionId),
    [editionId],
  );
  const matches = useAsyncData(
    () => publicApi.listMatches({ tournament_edition: editionId }),
    [editionId],
  );
  const groupTeams = useAsyncData(
    () => publicApi.listGroupTeams({ tournament_edition: editionId }),
    [editionId],
  );
  const events = useAsyncData(
    () =>
      publicApi.listEvents({
        tournament_edition: editionId,
        page_size: 500,
      }),
    [editionId],
  );
  const awards = useAsyncData(
    () => publicApi.listAwards(editionId),
    [editionId],
  );

  const participationNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const t of teams.data?.results ?? []) {
      map.set(t.id, t.participation_name || t.team?.name || `Ekipa #${t.id}`);
    }
    return map;
  }, [teams.data]);

  const participationTeamIds = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of teams.data?.results ?? []) {
      if (t.team?.id != null) map.set(t.id, t.team.id);
    }
    return map;
  }, [teams.data]);

  const teamAggs = useMemo(
    () =>
      buildTeamAggregates({
        players: players.data?.results ?? [],
        matches: matches.data?.results ?? [],
        groupTeams: groupTeams.data?.results ?? [],
        participationNames,
        participationTeamIds,
      }),
    [
      players.data,
      matches.data,
      groupTeams.data,
      participationNames,
      participationTeamIds,
    ],
  );

  const teamByGoals = useMemo(
    () =>
      topN(
        [...teamAggs].filter((t) => t.goals > 0).sort((a, b) => b.goals - a.goals),
        TOP,
      ),
    [teamAggs],
  );
  const teamByGd = useMemo(
    () =>
      topN(
        [...teamAggs]
          .map((t) => ({ ...t, gd: t.gf - t.ga }))
          .filter((t) => t.matches > 0)
          .sort((a, b) => b.gd - a.gd || b.gf - a.gf),
        TOP,
      ),
    [teamAggs],
  );
  const teamByPoints = useMemo(
    () =>
      topN(
        [...teamAggs]
          .filter((t) => t.points > 0)
          .sort((a, b) => b.points - a.points),
        TOP,
      ),
    [teamAggs],
  );
  const teamByWins = useMemo(
    () =>
      topN(
        [...teamAggs].filter((t) => t.wins > 0).sort((a, b) => b.wins - a.wins),
        TOP,
      ),
    [teamAggs],
  );
  const teamByDefense = useMemo(
    () =>
      topN(
        [...teamAggs]
          .filter((t) => t.matches > 0)
          .sort((a, b) => a.ga - b.ga || b.gf - a.gf),
        TOP,
      ),
    [teamAggs],
  );
  const teamByGpg = useMemo(
    () =>
      topN(
        [...teamAggs]
          .filter((t) => t.matches > 0 && t.gf > 0)
          .map((t) => ({ ...t, gpg: t.gf / t.matches }))
          .sort((a, b) => b.gpg - a.gpg),
        TOP,
      ),
    [teamAggs],
  );

  const playerList = players.data?.results ?? [];
  const scorers = useMemo(
    () =>
      topN(
        [...playerList]
          .filter((p) => (p.goals ?? 0) > 0)
          .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0)),
        TOP,
      ),
    [playerList],
  );
  const mostBooked = useMemo(
    () =>
      topN(
        [...playerList]
          .filter(
            (p) => (p.red_cards ?? 0) > 0 || (p.yellow_cards ?? 0) > 0,
          )
          .sort((a, b) => {
            const red = (b.red_cards ?? 0) - (a.red_cards ?? 0);
            if (red !== 0) return red;
            return (b.yellow_cards ?? 0) - (a.yellow_cards ?? 0);
          }),
        TOP,
      ),
    [playerList],
  );
  const gpgPlayers = useMemo(
    () =>
      topN(
        [...playerList]
          .filter((p) => (p.matches_played ?? 0) >= 2 && (p.goals ?? 0) > 0)
          .map((p) => ({
            p,
            gpg: (p.goals ?? 0) / (p.matches_played ?? 1),
          }))
          .sort((a, b) => b.gpg - a.gpg),
        TOP,
      ),
    [playerList],
  );
  const streaks = useMemo(
    () =>
      topN(
        scoringStreaks(
          events.data?.results ?? [],
          matches.data?.results ?? [],
          playerList,
        ).filter((s) => s.streak >= 2),
        TOP,
      ),
    [events.data, matches.data, playerList],
  );
  const mostMatches = useMemo(
    () =>
      topN(
        [...playerList]
          .filter((p) => (p.matches_played ?? 0) > 0)
          .sort((a, b) => (b.matches_played ?? 0) - (a.matches_played ?? 0)),
        TOP,
      ),
    [playerList],
  );
  const contribution = useMemo(
    () =>
      topN(
        [...playerList]
          .map((p) => ({
            p,
            ga: (p.goals ?? 0) + (p.assists ?? 0),
          }))
          .filter((x) => x.ga > 0)
          .sort((a, b) => b.ga - a.ga),
        TOP,
      ),
    [playerList],
  );

  const awardRows = normalizeList(awards.data);

  const teamNameByPlayerId = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of players.data?.results ?? []) {
      if (p.player?.id == null) continue;
      const name = p.team_name ?? p.participation_name;
      if (name) map.set(p.player.id, name);
    }
    return map;
  }, [players.data]);

  function playerHref(p: TeamParticipationPlayerListItem): string | undefined {
    return p.player?.id != null ? `/players/${p.player.id}` : undefined;
  }

  function teamHref(t: TeamAgg): string | undefined {
    return t.teamId != null ? `/teams/${t.teamId}` : undefined;
  }

  function playerName(p: TeamParticipationPlayerListItem) {
    return (
      <span className="edition-public-table__row-label">{personLabel(p)}</span>
    );
  }

  function teamNameLabel(label: string) {
    return (
      <span className="edition-public-table__row-label">{label || "—"}</span>
    );
  }

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading =
    edition.loading ||
    players.loading ||
    teams.loading ||
    matches.loading ||
    groupTeams.loading ||
    awards.loading;
  const error =
    edition.error ??
    players.error ??
    teams.error ??
    matches.error ??
    groupTeams.error ??
    events.error ??
    awards.error;

  return (
    <div className="page">
      <PageHeader
        title="Statistika"
        subtitle={edition.data?.name ?? "Edicija"}
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/editions/${editionId}`}
          >
            Dashboard
          </Link>
        }
      />
      <EditionPublicNav editionId={editionId} />
      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}

      <section className="border-frame border-frame--md">
        <h2 className="edition-section-title">Ekipne statistike</h2>
        <p className="muted edition-stat-note">Top {TOP} v vsaki kategoriji.</p>
        <div className="edition-stat-grid edition-stat-grid--teams">
          <StatTable
            title="Največ golov"
            headers={["Ekipa", "Goli"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={teamByGoals.map((t) => ({
              href: teamHref(t),
              cells: [teamNameLabel(t.name), String(t.goals)],
            }))}
          />
          <StatTable
            title="Najboljša gol razlika"
            headers={["Ekipa", "+/−", "Goli"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={teamByGd.map((t) => ({
              href: teamHref(t),
              cells: [
                teamNameLabel(t.name),
                String(t.gf - t.ga > 0 ? `+${t.gf - t.ga}` : t.gf - t.ga),
                `${t.gf}:${t.ga}`,
              ],
            }))}
          />
          <StatTable
            title="Največ točk"
            headers={["Ekipa", "Točke"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={teamByPoints.map((t) => ({
              href: teamHref(t),
              cells: [teamNameLabel(t.name), String(t.points)],
            }))}
          />
          <StatTable
            title="Največ zmag"
            headers={["Ekipa", "Zmage"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={teamByWins.map((t) => ({
              href: teamHref(t),
              cells: [teamNameLabel(t.name), String(t.wins)],
            }))}
          />
          <StatTable
            title="Najmanj prejetih"
            headers={["Ekipa", "Prejeti", "Tekme"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={teamByDefense.map((t) => ({
              href: teamHref(t),
              cells: [
                teamNameLabel(t.name),
                String(t.ga),
                String(t.matches),
              ],
            }))}
          />
          <StatTable
            title="Goli / tekmo"
            headers={["Ekipa", "G/T"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={teamByGpg.map((t) => ({
              href: teamHref(t),
              cells: [teamNameLabel(t.name), (t.gf / t.matches).toFixed(2)],
            }))}
          />
        </div>
      </section>

      <section className="border-frame border-frame--md">
        <h2 className="edition-section-title">Igralske statistike</h2>
        <p className="muted edition-stat-note">Top {TOP} v vsaki kategoriji.</p>
        <div className="edition-stat-grid edition-stat-grid--players">
          <StatTable
            title="Strelci"
            headers={["Igralec", "Ekipa", "Goli"]}
            empty="Še ni gola."
            onNavigate={navigate}
            rows={scorers.map((p) => ({
              href: playerHref(p),
              cells: [
                playerName(p),
                p.team_name ?? p.participation_name ?? "—",
                String(p.goals ?? 0),
              ],
            }))}
          />
          <StatTable
            title="Goli / tekmo"
            headers={["Igralec", "Ekipa", "G/T"]}
            empty="Ni podatkov (min. 2 tekmi)."
            onNavigate={navigate}
            rows={gpgPlayers.map(({ p, gpg }) => ({
              href: playerHref(p),
              cells: [
                playerName(p),
                p.team_name ?? p.participation_name ?? "—",
                gpg.toFixed(2),
              ],
            }))}
          />
          <StatTable
            title="Prispevek (G+A)"
            headers={["Igralec", "Ekipa", "G+A"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={contribution.map(({ p, ga }) => ({
              href: playerHref(p),
              cells: [
                playerName(p),
                p.team_name ?? p.participation_name ?? "—",
                String(ga),
              ],
            }))}
          />
          <StatTable
            title="Največ opominov"
            headers={["Igralec", "Ekipa", "🟥", "🟨"]}
            empty="Ni kartonov."
            onNavigate={navigate}
            rows={mostBooked.map((p) => ({
              href: playerHref(p),
              cells: [
                playerName(p),
                p.team_name ?? p.participation_name ?? "—",
                String(p.red_cards ?? 0),
                String(p.yellow_cards ?? 0),
              ],
            }))}
          />
          <StatTable
            title="Največ tekem"
            headers={["Igralec", "Ekipa", "Tekme"]}
            empty="Ni podatkov."
            onNavigate={navigate}
            rows={mostMatches.map((p) => ({
              href: playerHref(p),
              cells: [
                playerName(p),
                p.team_name ?? p.participation_name ?? "—",
                String(p.matches_played ?? 0),
              ],
            }))}
          />
          <StatTable
            title="Golov v zaporednih tekmah"
            headers={["Igralec", "Ekipa", "Zaporedje"]}
            empty="Ni serije (min. 2 tekmi zapored)."
            onNavigate={navigate}
            rows={streaks.map(({ player, streak }) => ({
              href: playerHref(player),
              cells: [
                playerName(player),
                player.team_name ?? player.participation_name ?? "—",
                String(streak),
              ],
            }))}
          />
        </div>
      </section>

      <section className="border-frame border-frame--md">
        <h2 className="edition-section-title">Nagrade</h2>
        {awardRows.length === 0 ? (
          <p className="muted">Ni nagrad.</p>
        ) : (
          <table className="data-table edition-public-table">
            <thead>
              <tr>
                <th>Nagrada</th>
                <th>Igralec</th>
                <th>Ekipa</th>
              </tr>
            </thead>
            <tbody>
              {awardRows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.award?.name}</strong>
                  </td>
                  <td>{a.player_name || "—"}</td>
                  <td className="muted">
                    {a.team_name ||
                      (a.player != null
                        ? teamNameByPlayerId.get(a.player)
                        : undefined) ||
                      "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
