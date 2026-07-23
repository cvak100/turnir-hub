import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import type { EditionListItem } from "@/modules/editions/services/editionService";
import type { MatchListItem } from "@/modules/matches/services/matchService";
import type { TeamParticipationPlayerListItem } from "@/modules/players/services/playerService";
import {
  normalizeList,
  publicApi,
  type PlayerAwardRow,
} from "@/modules/public/services/publicApi";
import { personLabel } from "@/modules/editions/publicEdition";
import { StatSection } from "../components/StatSection";
import {
  DonutChart,
  DualLineChart,
  GroupedBarsChart,
  ScatterChart,
  StackedBarsChart,
  type MultiPoint,
} from "../components/StatCharts";

type TabKey = "overall" | "edition";

const TOP = 8;

/** Demo / sandbox tournaments created by admin generators. */
function isFakeEdition(e: EditionListItem): boolean {
  const blob = `${e.tournament_name ?? ""} ${e.name ?? ""} ${e.location ?? ""}`
    .toLowerCase();
  return (
    blob.includes("sandbox") ||
    blob.includes("[sandbox]") ||
    blob.includes("demo") ||
    blob.includes("player history lab") ||
    blob.includes("demo arena")
  );
}

/** Finished + active public editions (exclude demo/sandbox). */
function isStatsEdition(e: EditionListItem): boolean {
  const code = (e.status?.code ?? "").toLowerCase();
  if (code !== "finished" && code !== "ongoing") return false;
  if (!e.is_public) return false;
  return !isFakeEdition(e);
}

type PlayerAgg = {
  playerId: number;
  name: string;
  teamLabel: string;
  goals: number;
  yellow: number;
  red: number;
  matches: number;
  editions: number;
};

type TeamAgg = {
  teamId: number | null;
  key: string;
  name: string;
  goals: number;
  yellow: number;
  red: number;
  matches: number;
};

type EditionAgg = {
  id: number;
  name: string;
  year: number;
  goals: number;
  matches: number;
  players: number;
};

function playerName(p: TeamParticipationPlayerListItem): string {
  return personLabel(p);
}

function aggregatePlayers(
  rows: TeamParticipationPlayerListItem[],
): PlayerAgg[] {
  const map = new Map<number, PlayerAgg>();
  for (const row of rows) {
    const id = row.player?.id;
    if (id == null) continue;
    let cur = map.get(id);
    if (!cur) {
      cur = {
        playerId: id,
        name: playerName(row),
        teamLabel: row.team_name || row.participation_name || "—",
        goals: 0,
        yellow: 0,
        red: 0,
        matches: 0,
        editions: 0,
      };
      map.set(id, cur);
    }
    cur.goals += row.goals ?? 0;
    cur.yellow += row.yellow_cards ?? 0;
    cur.red += row.red_cards ?? 0;
    cur.matches += row.matches_played ?? 0;
    cur.editions += 1;
    const team = row.team_name || row.participation_name;
    if (team) cur.teamLabel = team;
  }
  return [...map.values()];
}

function aggregateTeams(rows: TeamParticipationPlayerListItem[]): TeamAgg[] {
  const map = new Map<string, TeamAgg>();
  for (const row of rows) {
    const teamId = row.team_id ?? null;
    const name = row.team_name || row.participation_name || "Ekipa";
    const key = teamId != null ? `t:${teamId}` : `p:${row.team_participation}`;
    let cur = map.get(key);
    if (!cur) {
      cur = {
        teamId,
        key,
        name,
        goals: 0,
        yellow: 0,
        red: 0,
        matches: 0,
      };
      map.set(key, cur);
    }
    cur.goals += row.goals ?? 0;
    cur.yellow += row.yellow_cards ?? 0;
    cur.red += row.red_cards ?? 0;
    cur.matches = Math.max(cur.matches, row.matches_played ?? 0);
  }
  return [...map.values()];
}

function aggregateEditions(
  rows: TeamParticipationPlayerListItem[],
  matches: MatchListItem[],
): EditionAgg[] {
  const map = new Map<number, EditionAgg>();
  for (const row of rows) {
    const id = row.tournament_edition_id;
    if (id == null) continue;
    let cur = map.get(id);
    if (!cur) {
      cur = {
        id,
        name: row.tournament_edition_name || `Edicija #${id}`,
        year: row.tournament_edition_year ?? 0,
        goals: 0,
        matches: 0,
        players: 0,
      };
      map.set(id, cur);
    }
    cur.goals += row.goals ?? 0;
    cur.players += 1;
  }
  for (const m of matches) {
    const id = m.edition_id;
    if (id == null || m.home_score == null) continue;
    let cur = map.get(id);
    if (!cur) {
      cur = {
        id,
        name: m.edition_name || `Edicija #${id}`,
        year: 0,
        goals: 0,
        matches: 0,
        players: 0,
      };
      map.set(id, cur);
    } else if (m.edition_name && cur.name.startsWith("Edicija #")) {
      cur.name = m.edition_name;
    }
    cur.matches += 1;
  }
  return [...map.values()];
}

function topN<T>(rows: T[], n = TOP): T[] {
  return rows.slice(0, n);
}

function toMulti(p: PlayerAgg): MultiPoint {
  return {
    id: p.playerId,
    label: p.name,
    values: {
      goals: p.goals,
      matches: p.matches,
      yellow: p.yellow,
      red: p.red,
    },
  };
}

function StatsPanels({
  players,
  matches,
  awards,
  scopeNote,
}: {
  players: TeamParticipationPlayerListItem[];
  matches: MatchListItem[];
  awards: PlayerAwardRow[];
  scopeNote: string;
}) {
  const playerAggs = useMemo(() => aggregatePlayers(players), [players]);
  const teamAggs = useMemo(() => aggregateTeams(players), [players]);
  const editionAggs = useMemo(
    () => aggregateEditions(players, matches),
    [players, matches],
  );

  const scorers = useMemo(
    () =>
      topN(
        [...playerAggs]
          .filter((p) => p.goals > 0)
          .sort((a, b) => b.goals - a.goals || b.matches - a.matches),
      ),
    [playerAggs],
  );

  const mostMatches = useMemo(
    () =>
      topN(
        [...playerAggs]
          .filter((p) => p.matches > 0)
          .sort((a, b) => b.matches - a.matches || b.goals - a.goals),
      ),
    [playerAggs],
  );

  const booked = useMemo(
    () =>
      topN(
        [...playerAggs]
          .filter((p) => p.yellow > 0 || p.red > 0)
          .sort(
            (a, b) =>
              b.red * 2 + b.yellow - (a.red * 2 + a.yellow) || b.red - a.red,
          ),
      ),
    [playerAggs],
  );

  const teamGoals = useMemo(
    () =>
      topN(
        [...teamAggs]
          .filter((t) => t.goals > 0)
          .sort((a, b) => b.goals - a.goals),
      ),
    [teamAggs],
  );

  const editionsByGoals = useMemo(
    () =>
      topN(
        [...editionAggs]
          .filter((e) => e.goals > 0 || e.matches > 0)
          .sort((a, b) => b.goals - a.goals || b.year - a.year),
        10,
      ),
    [editionAggs],
  );

  const awardCounts = useMemo(() => {
    const map = new Map<
      number,
      { playerId: number; name: string; count: number }
    >();
    for (const a of awards) {
      const id = a.player;
      if (id == null) continue;
      let cur = map.get(id);
      if (!cur) {
        cur = {
          playerId: id,
          name: a.player_name || `Igralec #${id}`,
          count: 0,
        };
        map.set(id, cur);
      }
      cur.count += 1;
    }
    return topN([...map.values()].sort((a, b) => b.count - a.count));
  }, [awards]);

  return (
    <div className="stats-panels">
      <p className="muted stats-scope-note">{scopeNote}</p>

      <StatSection
        title="Strelci"
        note="Tabela: goli · Graf: goli + nastopi"
        headers={["Igralec", "Ekipa", "Goli"]}
        empty="Še ni gola."
        rows={scorers.map((p) => ({
          href: `/players/${p.playerId}`,
          cells: [
            <span key="n" className="public-table__row-label">
              {p.name}
            </span>,
            p.teamLabel,
            String(p.goals),
          ],
        }))}
        chart={
          <GroupedBarsChart
            empty="Še ni gola."
            points={scorers.map(toMulti)}
            series={[
              { key: "goals", label: "Goli", color: "var(--blue)" },
              { key: "matches", label: "Nastopi", color: "var(--ink)" },
            ]}
          />
        }
      />

      <StatSection
        title="Nastopi"
        note="Tabela: tekme · Graf: razmerje golov in nastopov"
        headers={["Igralec", "Ekipa", "Tekme", "Goli"]}
        empty="Ni nastopov."
        rows={mostMatches.map((p) => ({
          href: `/players/${p.playerId}`,
          cells: [
            <span key="n" className="public-table__row-label">
              {p.name}
            </span>,
            p.teamLabel,
            String(p.matches),
            String(p.goals),
          ],
        }))}
        chart={
          <ScatterChart
            empty="Ni nastopov."
            points={mostMatches.map(toMulti)}
            xKey="matches"
            yKey="goals"
            xLabel="Nastopi"
            yLabel="Goli"
            color="var(--blue)"
          />
        }
      />

      <StatSection
        title="Kartoni"
        note="Tabela: kartoni · Graf: rumene + rdeči skupaj"
        headers={["Igralec", "Ekipa", "Rdeči", "Rumene"]}
        empty="Ni kartonov."
        rows={booked.map((p) => ({
          href: `/players/${p.playerId}`,
          cells: [
            <span key="n" className="public-table__row-label">
              {p.name}
            </span>,
            p.teamLabel,
            String(p.red),
            String(p.yellow),
          ],
        }))}
        chart={
          <StackedBarsChart
            empty="Ni kartonov."
            points={booked.map(toMulti)}
            series={[
              { key: "yellow", label: "Rumene", color: "#c9a227" },
              { key: "red", label: "Rdeči", color: "var(--red)" },
            ]}
          />
        }
      />

      <StatSection
        title="Ekipe — goli"
        note="Tabela: goli · Graf: delež golov med top ekipami"
        headers={["Ekipa", "Goli"]}
        empty="Ni ekipnih golov."
        rows={teamGoals.map((t) => ({
          href: t.teamId != null ? `/teams/${t.teamId}` : undefined,
          cells: [
            <span key="n" className="public-table__row-label">
              {t.name}
            </span>,
            String(t.goals),
          ],
        }))}
        chart={
          <DonutChart
            empty="Ni ekipnih golov."
            items={teamGoals.map((t) => ({
              id: t.key,
              label: t.name,
              value: t.goals,
            }))}
          />
        }
      />

      <StatSection
        title="Goli po edicijah"
        note="Tabela: goli · Graf: goli in tekme skozi zaključene edicije"
        headers={["Edicija", "Leto", "Goli", "Tekme"]}
        empty="Ni podatkov po edicijah."
        rows={editionsByGoals.map((e) => ({
          href: `/editions/${e.id}/statistika`,
          cells: [
            <span key="n" className="public-table__row-label">
              {e.name}
            </span>,
            e.year ? String(e.year) : "—",
            String(e.goals),
            String(e.matches),
          ],
        }))}
        chart={
          <DualLineChart
            empty="Ni podatkov po edicijah."
            points={editionsByGoals.map((e) => ({
              id: e.id,
              label: e.name,
              values: {
                year: e.year,
                goals: e.goals,
                matches: e.matches,
              },
            }))}
            series={[
              { key: "goals", label: "Goli", color: "var(--blue)" },
              { key: "matches", label: "Tekme", color: "#c45c26" },
            ]}
          />
        }
      />

      <StatSection
        title="Nagrade"
        note="Tabela: število · Graf: delež nagrad"
        headers={["Igralec", "Nagrade"]}
        empty="Ni nagrad."
        rows={awardCounts.map((a) => ({
          href: `/players/${a.playerId}`,
          cells: [
            <span key="n" className="public-table__row-label">
              {a.name}
            </span>,
            String(a.count),
          ],
        }))}
        chart={
          <DonutChart
            empty="Ni nagrad."
            items={awardCounts.map((a) => ({
              id: a.playerId,
              label: a.name,
              value: a.count,
            }))}
          />
        }
      />
    </div>
  );
}

export function StatsPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get("tab") === "edition" ? "edition" : "overall";
  const editionFromUrl = Number(params.get("edition") || "") || "";
  const [editionId, setEditionId] = useState<number | "">(editionFromUrl);

  function setTab(next: TabKey) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("tab", next);
    if (next === "edition" && editionId) {
      nextParams.set("edition", String(editionId));
    } else if (next !== "edition") {
      nextParams.delete("edition");
    }
    setParams(nextParams, { replace: true });
  }

  function selectEdition(id: number | "") {
    setEditionId(id);
    const nextParams = new URLSearchParams(params);
    nextParams.set("tab", "edition");
    if (id) nextParams.set("edition", String(id));
    else nextParams.delete("edition");
    setParams(nextParams, { replace: true });
  }

  const editions = useAsyncData(() => publicApi.listEditions(), []);

  const statsEditions = useMemo(
    () => (editions.data?.results ?? []).filter(isStatsEdition),
    [editions.data],
  );

  const statsEditionIds = useMemo(
    () => new Set(statsEditions.map((e) => e.id)),
    [statsEditions],
  );

  const safeEditionId =
    editionId !== "" && statsEditionIds.has(Number(editionId))
      ? Number(editionId)
      : "";

  const overallPlayers = useAsyncData(
    () =>
      tab === "overall"
        ? publicApi.listPlayers({ page_size: 500, ordering: "-goals" })
        : Promise.resolve({
            count: 0,
            next: null,
            previous: null,
            results: [] as TeamParticipationPlayerListItem[],
          }),
    [tab],
  );

  const overallMatches = useAsyncData(
    () =>
      tab === "overall"
        ? publicApi.listMatches({ page_size: 300 })
        : Promise.resolve({
            count: 0,
            next: null,
            previous: null,
            results: [] as MatchListItem[],
          }),
    [tab],
  );

  const overallAwards = useAsyncData(
    () =>
      tab === "overall"
        ? publicApi.listAllAwards({ page_size: 200 })
        : Promise.resolve({
            count: 0,
            next: null,
            previous: null,
            results: [] as PlayerAwardRow[],
          }),
    [tab],
  );

  const editionPlayers = useAsyncData(
    () =>
      tab === "edition" && safeEditionId
        ? publicApi.listEditionPlayers(safeEditionId)
        : Promise.resolve({
            count: 0,
            next: null,
            previous: null,
            results: [] as TeamParticipationPlayerListItem[],
          }),
    [tab, safeEditionId],
  );

  const editionMatches = useAsyncData(
    () =>
      tab === "edition" && safeEditionId
        ? publicApi.listMatches({
            tournament_edition: safeEditionId,
            page_size: 200,
          })
        : Promise.resolve({
            count: 0,
            next: null,
            previous: null,
            results: [] as MatchListItem[],
          }),
    [tab, safeEditionId],
  );

  const editionAwards = useAsyncData(
    () =>
      tab === "edition" && safeEditionId
        ? publicApi.listAwards(safeEditionId)
        : Promise.resolve({
            count: 0,
            next: null,
            previous: null,
            results: [] as PlayerAwardRow[],
          }),
    [tab, safeEditionId],
  );

  const overallFilteredPlayers = useMemo(
    () =>
      (overallPlayers.data?.results ?? []).filter(
        (p) =>
          p.tournament_edition_id != null &&
          statsEditionIds.has(p.tournament_edition_id),
      ),
    [overallPlayers.data, statsEditionIds],
  );

  const overallFilteredMatches = useMemo(
    () =>
      (overallMatches.data?.results ?? []).filter(
        (m) => m.edition_id != null && statsEditionIds.has(m.edition_id),
      ),
    [overallMatches.data, statsEditionIds],
  );

  const overallFilteredAwards = useMemo(
    () =>
      normalizeList(overallAwards.data).filter((a) =>
        statsEditionIds.has(a.tournament_edition),
      ),
    [overallAwards.data, statsEditionIds],
  );

  const loadingOverall =
    tab === "overall" &&
    (editions.loading ||
      overallPlayers.loading ||
      overallMatches.loading ||
      overallAwards.loading);
  const loadingEdition =
    tab === "edition" &&
    Boolean(safeEditionId) &&
    (editionPlayers.loading ||
      editionMatches.loading ||
      editionAwards.loading);

  const error =
    editions.error ??
    (tab === "overall"
      ? overallPlayers.error ?? overallMatches.error ?? overallAwards.error
      : editionPlayers.error ?? editionMatches.error ?? editionAwards.error);

  return (
    <div className="page">
      <PageHeader
        title="Statistika"
        subtitle="Zaključeni in aktivni turnirji (brez demo/sandbox)."
      />
      <ErrorBanner error={error} />

      <div className="public-filter-row row-actions stats-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overall"}
          className={
            tab === "overall"
              ? "border-frame border-frame--sm"
              : "button-secondary border-frame border-frame--sm"
          }
          onClick={() => setTab("overall")}
        >
          Skupno
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "edition"}
          className={
            tab === "edition"
              ? "border-frame border-frame--sm"
              : "button-secondary border-frame border-frame--sm"
          }
          onClick={() => setTab("edition")}
        >
          Po turnirju
        </button>
      </div>

      {tab === "edition" ? (
        <label className="stack-form border-frame border-frame--md stats-edition-pick">
          Zaključena / aktivna edicija
          <select
            value={safeEditionId === "" ? "" : String(safeEditionId)}
            onChange={(e) =>
              selectEdition(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">— izberi edicijo —</option>
            {statsEditions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} ({ed.year})
                {ed.tournament_name ? ` · ${ed.tournament_name}` : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {editions.loading || loadingOverall || loadingEdition ? (
        <StateMessage variant="loading" />
      ) : null}

      {tab === "edition" && !safeEditionId && !editions.loading ? (
        <StateMessage
          variant="empty"
          message={
            statsEditions.length === 0
              ? "Ni zaključenih ali aktivnih turnirjev za statistiko."
              : "Izberi edicijo."
          }
        />
      ) : null}

      {tab === "overall" && !loadingOverall ? (
        statsEditions.length === 0 ? (
          <StateMessage
            variant="empty"
            message="Ni zaključenih ali aktivnih turnirjev za statistiko."
          />
        ) : (
          <StatsPanels
            players={overallFilteredPlayers}
            matches={overallFilteredMatches}
            awards={overallFilteredAwards}
            scopeNote={`Top 8 · ${statsEditions.length} zaključenih/aktivnih edicij (brez demo/sandbox).`}
          />
        )
      ) : null}

      {tab === "edition" && safeEditionId && !loadingEdition ? (
        <StatsPanels
          players={editionPlayers.data?.results ?? []}
          matches={editionMatches.data?.results ?? []}
          awards={normalizeList(editionAwards.data)}
          scopeNote="Top 8 po kategoriji — izbrana edicija."
        />
      ) : null}
    </div>
  );
}
