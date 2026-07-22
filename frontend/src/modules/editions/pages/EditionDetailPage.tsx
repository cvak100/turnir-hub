import { useEffect, useMemo } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { isLiveMatchStatus } from "@/modules/live/matchStatuses";
import type { MatchListItem } from "@/modules/matches/services/matchService";
import {
  normalizeList,
  publicApi,
  type PublicGroupTeamRow,
} from "@/modules/public/services/publicApi";

function personLabel(p: {
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

function matchLabel(m: MatchListItem): string {
  const home = m.home_team_name ?? "TBD";
  const away = m.away_team_name ?? "TBD";
  if (m.home_score != null && m.away_score != null) {
    return `${home} ${m.home_score}:${m.away_score} ${away}`;
  }
  return `${home} – ${away}`;
}

function sortGroupRows(rows: PublicGroupTeamRow[]): PublicGroupTeamRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdB !== gdA) return gdB - gdA;
    return b.goals_for - a.goals_for;
  });
}

function isKnockoutPhaseType(code: string | null | undefined): boolean {
  const t = (code ?? "").toLowerCase();
  return t === "knockout" || t === "third_place" || t.includes("knock");
}

export function EditionDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const editionId = Number(id);

  const edition = useAsyncData(
    () => publicApi.getEdition(editionId),
    [editionId],
  );
  const phases = useAsyncData(
    () => publicApi.listPhases(editionId),
    [editionId],
  );
  const matches = useAsyncData(
    () => publicApi.listMatches({ tournament_edition: editionId }),
    [editionId],
  );
  const groups = useAsyncData(
    () => publicApi.listGroups({ tournament_edition: editionId }),
    [editionId],
  );
  const groupTeams = useAsyncData(
    () => publicApi.listGroupTeams({ tournament_edition: editionId }),
    [editionId],
  );
  const teams = useAsyncData(
    () => publicApi.listParticipations(editionId),
    [editionId],
  );
  const players = useAsyncData(
    () => publicApi.listEditionPlayers(editionId),
    [editionId],
  );
  const standings = useAsyncData(
    () => publicApi.listStandings(editionId),
    [editionId],
  );
  const awards = useAsyncData(
    () => publicApi.listAwards(editionId),
    [editionId],
  );

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash, edition.loading, matches.loading, groups.loading]);

  const matchRows = useMemo(() => {
    const rows = matches.data?.results ?? [];
    return [...rows].sort((a, b) => {
      const da = a.match_date
        ? new Date(a.match_date).getTime()
        : Number.MAX_SAFE_INTEGER;
      const db = b.match_date
        ? new Date(b.match_date).getTime()
        : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [matches.data]);

  const groupTables = useMemo(() => {
    const groupList = groups.data?.results ?? [];
    const rows = groupTeams.data?.results ?? [];
    return [...groupList]
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((g) => {
        const phase = phases.data?.results.find(
          (p) => p.id === g.tournament_phase,
        );
        return {
          group: g,
          phaseName:
            phase?.name ??
            rows.find((r) => r.tournament_phase_group === g.id)?.phase_name,
          rows: sortGroupRows(
            rows.filter((r) => r.tournament_phase_group === g.id),
          ),
        };
      })
      .filter((t) => t.rows.length > 0);
  }, [groups.data, groupTeams.data, phases.data]);

  const knockoutMatches = useMemo(() => {
    const phaseById = new Map(
      (phases.data?.results ?? []).map((p) => [p.id, p]),
    );
    return matchRows.filter((m) => {
      const phase = phaseById.get(m.tournament_phase);
      const type = phase?.phase_type ?? m.phase_type;
      return isKnockoutPhaseType(type);
    });
  }, [matchRows, phases.data]);

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading =
    edition.loading ||
    phases.loading ||
    matches.loading ||
    teams.loading ||
    players.loading ||
    groups.loading ||
    groupTeams.loading;
  const error =
    edition.error ??
    phases.error ??
    matches.error ??
    teams.error ??
    players.error ??
    groups.error ??
    groupTeams.error ??
    standings.error ??
    awards.error;

  const liveMatches = matchRows.filter((m) =>
    isLiveMatchStatus(m.status?.code),
  );
  const standingRows = normalizeList(standings.data);
  const awardRows = normalizeList(awards.data);
  const isFinished = edition.data?.status?.code === "finished";

  const topScorers = [...(players.data?.results ?? [])]
    .filter((p) => (p.goals ?? 0) > 0)
    .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))
    .slice(0, 10);

  const playerRows = [...(players.data?.results ?? [])].sort((a, b) =>
    personLabel(a).localeCompare(personLabel(b), "sl"),
  );

  return (
    <div className="page">
      <PageHeader
        title={edition.data?.name ?? "Edicija"}
        subtitle={
          edition.data
            ? `${edition.data.tournament.name} · ${edition.data.year} · ${edition.data.status?.name ?? edition.data.status?.code}`
            : "Javni dashboard edicije"
        }
        actions={
          liveMatches.length > 0 ? (
            <Link className="button-link border-frame border-frame--sm" to="/live">
              Live
            </Link>
          ) : null
        }
      />
      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}

      {edition.data ? (
        <section id="info" className="border-frame border-frame--md">
          <h2>Osnovni podatki</h2>
          <ul className="plain-list">
            <li>
              Turnir:{" "}
              <Link to={`/tournaments/${edition.data.tournament.id}`}>
                {edition.data.tournament.name}
              </Link>
            </li>
            <li>Lokacija: {edition.data.location || "—"}</li>
            <li>Kategorija: {edition.data.category?.name || "—"}</li>
            <li>
              Datumi: {edition.data.start_date} → {edition.data.end_date}
            </li>
            {edition.data.public_rules ? (
              <li className="muted">{edition.data.public_rules}</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section id="standings" className="border-frame border-frame--md">
        <h2>{isFinished ? "Lestvica" : "Lestvica"}</h2>

        {groupTables.length > 0 ? (
          <div className="edition-standings-groups">
            <h3>Skupine</h3>
            {groupTables.map(({ group, phaseName, rows }) => (
              <div key={group.id} className="edition-standings-group">
                <h4>
                  {group.name}
                  {phaseName ? (
                    <span className="muted"> · {phaseName}</span>
                  ) : null}
                </h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ekipa</th>
                      <th title="Tekme">T</th>
                      <th title="Zmage">Z</th>
                      <th title="Neodločeno">N</th>
                      <th title="Porazi">P</th>
                      <th title="Goli">G</th>
                      <th title="Gol razlika">+/−</th>
                      <th>Točke</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const gd = row.goals_for - row.goals_against;
                      return (
                        <tr key={row.id}>
                          <td>{idx + 1}</td>
                          <td>{row.participation_name || `#${row.team_participation}`}</td>
                          <td>{row.played}</td>
                          <td>{row.wins}</td>
                          <td>{row.draws}</td>
                          <td>{row.losses}</td>
                          <td>
                            {row.goals_for}:{row.goals_against}
                          </td>
                          <td>{gd > 0 ? `+${gd}` : gd}</td>
                          <td>
                            <strong>{row.points}</strong>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : null}

        <div className="edition-standings-knockout">
          <h3>Knockout</h3>
          {knockoutMatches.length === 0 ? (
            <p className="muted">Ni knockout tekem.</p>
          ) : (
            <ul className="plain-list">
              {knockoutMatches.map((m) => (
                <li key={m.id}>
                  <span className="muted">
                    {m.phase_name ??
                      phases.data?.results.find((p) => p.id === m.tournament_phase)
                        ?.name ??
                      "Faza"}
                    {" · "}
                  </span>
                  <Link to={`/live/matches/${m.id}`}>{matchLabel(m)}</Link>
                  <span className="muted">
                    {" "}
                    · {m.status?.name ?? m.status?.code ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {standingRows.length > 0 ? (
          <div className="edition-standings-final">
            <h3>Končna lestvica</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ekipa</th>
                  <th>T</th>
                  <th>G</th>
                </tr>
              </thead>
              <tbody>
                {standingRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.position}</td>
                    <td>{row.team_name ?? `#${row.team_participation}`}</td>
                    <td>{row.points ?? "—"}</td>
                    <td>
                      {row.goals_for != null && row.goals_against != null
                        ? `${row.goals_for}:${row.goals_against}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : groupTables.length === 0 && knockoutMatches.length === 0 ? (
          <p className="muted">Lestvica še ni na voljo.</p>
        ) : null}
      </section>

      <section id="schedule" className="border-frame border-frame--md">
        <h2>Razpored</h2>
        {matchRows.length === 0 ? (
          <p className="muted">Ni tekem.</p>
        ) : (
          <ul className="plain-list">
            {matchRows.map((m) => (
              <li key={m.id}>
                <Link to={`/live/matches/${m.id}`}>{matchLabel(m)}</Link>
                <span className="muted">
                  {" "}
                  · {m.status?.name ?? m.status?.code}
                  {m.match_date
                    ? ` · ${new Date(m.match_date).toLocaleString()}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="teams" className="border-frame border-frame--md">
        <h2>Ekipe</h2>
        {(teams.data?.results.length ?? 0) === 0 ? (
          <p className="muted">Ni ekip.</p>
        ) : (
          <ul className="plain-list">
            {teams.data?.results.map((t) => (
              <li key={t.id}>
                {t.team?.id ? (
                  <Link to={`/teams/${t.team.id}`}>
                    {t.participation_name || t.team.name}
                  </Link>
                ) : (
                  t.participation_name
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="players" className="border-frame border-frame--md">
        <h2>Igralci</h2>
        {playerRows.length === 0 ? (
          <p className="muted">Ni igralcev.</p>
        ) : (
          <ul className="plain-list">
            {playerRows.map((p) => (
              <li key={p.id}>
                {p.player?.id ? (
                  <Link to={`/players/${p.player.id}`}>{personLabel(p)}</Link>
                ) : (
                  personLabel(p)
                )}
                {p.team_name || p.participation_name
                  ? ` · ${p.team_name ?? p.participation_name}`
                  : ""}
                {p.jersey_number != null ? ` · #${p.jersey_number}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="stats" className="border-frame border-frame--md">
        <h2>Statistika</h2>
        {topScorers.length === 0 ? (
          <p className="muted">Še ni gola / statistik.</p>
        ) : (
          <ul className="plain-list">
            {topScorers.map((p) => (
              <li key={p.id}>
                {p.player?.id ? (
                  <Link to={`/players/${p.player.id}`}>{personLabel(p)}</Link>
                ) : (
                  personLabel(p)
                )}{" "}
                — {p.goals} golov
                {p.assists ? `, ${p.assists} asistenc` : ""}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link to={`/stats?edition=${editionId}`}>
            Odpri celotno statistiko te edicije
          </Link>
        </p>
      </section>

      <section className="border-frame border-frame--md">
        <h2>Live</h2>
        {liveMatches.length === 0 ? (
          <p className="muted">Trenutno ni live tekem te edicije.</p>
        ) : (
          <ul className="plain-list">
            {liveMatches.map((m) => (
              <li key={m.id}>
                <Link to={`/live/matches/${m.id}`}>{matchLabel(m)}</Link>
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link to="/live">Vse live tekme</Link>
        </p>
      </section>

      <section id="awards" className="border-frame border-frame--md">
        <h2>Nagrade in priznanja</h2>
        {awardRows.length === 0 ? (
          <p className="muted">
            {isFinished
              ? "Ni vpisanih nagrad."
              : "Nagrade se prikažejo predvsem po zaključku."}
          </p>
        ) : (
          <ul className="plain-list">
            {awardRows.map((a) => (
              <li key={a.id}>
                <strong>{a.award?.name}</strong>
                {a.player_name ? ` — ${a.player_name}` : ""}
                {a.team_name ? ` (${a.team_name})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
