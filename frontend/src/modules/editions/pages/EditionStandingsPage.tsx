import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import {
  normalizeList,
  publicApi,
} from "@/modules/public/services/publicApi";
import {
  buildGroupTables,
  EditionPublicNav,
  formatMatchDate,
  groupKnockoutByPhase,
  scoreCell,
  sortMatchesByDate,
} from "../publicEdition.tsx";

export function EditionStandingsPage() {
  const { id } = useParams();
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
  const standings = useAsyncData(
    () => publicApi.listStandings(editionId),
    [editionId],
  );

  const matchRows = useMemo(
    () => sortMatchesByDate(matches.data?.results ?? []),
    [matches.data],
  );
  const groupTables = useMemo(
    () =>
      buildGroupTables(
        groups.data?.results ?? [],
        groupTeams.data?.results ?? [],
        phases.data?.results ?? [],
      ),
    [groups.data, groupTeams.data, phases.data],
  );
  const knockoutRounds = useMemo(
    () => groupKnockoutByPhase(matchRows, phases.data?.results ?? []),
    [matchRows, phases.data],
  );
  const standingRows = normalizeList(standings.data);

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading =
    edition.loading ||
    phases.loading ||
    matches.loading ||
    groups.loading ||
    groupTeams.loading ||
    standings.loading;
  const error =
    edition.error ??
    phases.error ??
    matches.error ??
    groups.error ??
    groupTeams.error ??
    standings.error;

  const empty =
    groupTables.length === 0 &&
    knockoutRounds.length === 0 &&
    standingRows.length === 0;

  return (
    <div className="page">
      <PageHeader
        title="Lestvica"
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

      {!loading && empty ? (
        <section className="border-frame border-frame--md">
          <p className="muted">Lestvica še ni na voljo.</p>
        </section>
      ) : null}

      {groupTables.length > 0 ? (
        <section className="border-frame border-frame--md">
          <h2 className="edition-section-title">Skupinski del</h2>
          <div className="edition-standings-groups">
            {groupTables.map(({ group, phaseName, rows }) => (
              <div key={group.id} className="edition-standings-group">
                <h3>
                  {group.name}
                  {phaseName ? (
                    <span className="muted"> · {phaseName}</span>
                  ) : null}
                </h3>
                <div className="table-scroll">
                  <table className="data-table edition-public-table">
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
                            <td>
                              {row.participation_name ||
                                `#${row.team_participation}`}
                            </td>
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
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-frame border-frame--md">
        <h2 className="edition-section-title">Knockout</h2>
        {knockoutRounds.length === 0 ? (
          <p className="muted">Ni knockout tekem.</p>
        ) : (
          <div className="edition-knockout-rounds">
            {knockoutRounds.map((round) => (
              <div key={round.phaseId} className="edition-knockout-round">
                <h3>{round.phaseName}</h3>
                <div className="table-scroll">
                  <table className="data-table edition-public-table">
                    <thead>
                      <tr>
                        <th>Datum</th>
                        <th>Domači</th>
                        <th className="edition-public-table__score">Rezultat</th>
                        <th>Gostje</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {round.matches.map((m) => (
                        <tr key={m.id}>
                          <td className="muted">
                            {formatMatchDate(m.match_date)}
                          </td>
                          <td>{m.home_team_name ?? "TBD"}</td>
                          <td className="edition-public-table__score">
                            <Link to={`/live/matches/${m.id}`}>
                              {scoreCell(m)}
                            </Link>
                          </td>
                          <td>{m.away_team_name ?? "TBD"}</td>
                          <td className="muted">
                            {m.status?.name ?? m.status?.code ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {standingRows.length > 0 ? (
        <section className="border-frame border-frame--md">
          <h2 className="edition-section-title">Končna lestvica</h2>
          <div className="table-scroll">
            <table className="data-table edition-public-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ekipa</th>
                  <th>Tekme</th>
                  <th>Z</th>
                  <th>N</th>
                  <th>P</th>
                  <th>Goli</th>
                  <th>+/−</th>
                  <th>Točke</th>
                </tr>
              </thead>
              <tbody>
                {standingRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.position}</td>
                    <td>{row.team_name ?? `#${row.team_participation}`}</td>
                    <td>{row.matches_played ?? "—"}</td>
                    <td>{row.wins ?? "—"}</td>
                    <td>{row.draws ?? "—"}</td>
                    <td>{row.losses ?? "—"}</td>
                    <td>
                      {row.goals_for != null && row.goals_against != null
                        ? `${row.goals_for}:${row.goals_against}`
                        : "—"}
                    </td>
                    <td>
                      {row.goal_difference != null
                        ? row.goal_difference > 0
                          ? `+${row.goal_difference}`
                          : row.goal_difference
                        : "—"}
                    </td>
                    <td>
                      <strong>{row.points ?? "—"}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
