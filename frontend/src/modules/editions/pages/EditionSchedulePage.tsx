import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { publicApi } from "@/modules/public/services/publicApi";
import {
  EditionPublicNav,
  formatMatchDate,
  formatMatchTime,
  groupMatchesByPhase,
  scoreCell,
} from "../publicEdition.tsx";

export function EditionSchedulePage() {
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

  const phaseBlocks = useMemo(
    () =>
      groupMatchesByPhase(
        matches.data?.results ?? [],
        phases.data?.results ?? [],
      ),
    [matches.data, phases.data],
  );

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading = edition.loading || matches.loading || phases.loading;
  const error = edition.error ?? matches.error ?? phases.error;

  return (
    <div className="page">
      <PageHeader
        title="Razpored"
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

      {!loading && phaseBlocks.length === 0 ? (
        <section className="border-frame border-frame--md">
          <p className="muted">Ni tekem.</p>
        </section>
      ) : null}

      {phaseBlocks.map((block) => (
        <section
          key={block.phaseId}
          className="border-frame border-frame--md edition-schedule-phase"
        >
          <h2 className="edition-section-title">{block.phaseName}</h2>
          <div className="table-scroll">
            <table className="data-table edition-public-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Ura</th>
                  <th>Skupina</th>
                  <th>Domači</th>
                  <th className="edition-public-table__score">Rezultat</th>
                  <th>Gostje</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {block.matches.map((m) => (
                  <tr key={m.id}>
                    <td>{formatMatchDate(m.match_date)}</td>
                    <td className="muted">{formatMatchTime(m.match_date)}</td>
                    <td className="muted">{m.group_name || "—"}</td>
                    <td>{m.home_team_name ?? "TBD"}</td>
                    <td className="edition-public-table__score">
                      <Link to={`/live/matches/${m.id}`}>{scoreCell(m)}</Link>
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
        </section>
      ))}
    </div>
  );
}
