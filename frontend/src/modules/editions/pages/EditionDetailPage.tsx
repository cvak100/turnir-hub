import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { matchService } from "@/modules/matches/services/matchService";
import { phaseService } from "@/modules/matches/services/matchService";
import { teamParticipationService } from "@/modules/teams/services/teamService";
import { editionService } from "../services/editionService";

export function EditionDetailPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission, user } = useAuth();

  const edition = useAsyncData(
    () => editionService.get(editionId),
    [editionId],
  );
  const teams = useAsyncData(
    () => teamParticipationService.list({ tournament_edition: editionId }),
    [editionId],
  );
  const phases = useAsyncData(
    () => phaseService.list({ tournament_edition: editionId }),
    [editionId],
  );
  const matches = useAsyncData(
    () => matchService.list({ tournament_edition: editionId }),
    [editionId],
  );

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Invalid edition id." />;
  }

  const canEdit =
    user &&
    (hasPermission("edition.edit", editionId) ||
      hasPermission("edition.manage", editionId));

  return (
    <div className="page">
      <PageHeader
        title={edition.data?.name ?? "Edition"}
        subtitle={
          edition.data
            ? `${edition.data.year} · ${edition.data.status?.name ?? edition.data.status?.code}`
            : "Edition preparation dashboard"
        }
        actions={
          canEdit ? (
            <Link className="button-link border-frame border-frame--sm" to={`/editions/${editionId}/edit`}>
              Edit
            </Link>
          ) : null
        }
      />
      <ErrorBanner
        error={
          edition.error ?? teams.error ?? phases.error ?? matches.error
        }
      />
      {edition.loading ? <StateMessage variant="loading" /> : null}

      {edition.data ? (
        <section className="border-frame border-frame--md">
          <ul className="plain-list">
            <li>
              Tournament:{" "}
              <Link to={`/tournaments/${edition.data.tournament.id}`}>
                {edition.data.tournament.name}
              </Link>
            </li>
            <li>Location: {edition.data.location || "—"}</li>
            <li>Category: {edition.data.category?.name || "—"}</li>
            <li>
              Dates: {edition.data.start_date} → {edition.data.end_date}
            </li>
            <li>Public: {edition.data.is_public ? "yes" : "no"}</li>
          </ul>
        </section>
      ) : null}

      <section className="border-frame border-frame--md">
        <h2>Preparation snapshot</h2>
        <ul className="plain-list">
          <li>
            Teams (participations):{" "}
            {teams.loading ? "…" : (teams.data?.count ?? 0)}
          </li>
          <li>Phases: {phases.loading ? "…" : (phases.data?.count ?? 0)}</li>
          <li>Matches: {matches.loading ? "…" : (matches.data?.count ?? 0)}</li>
        </ul>
      </section>

      <section className="border-frame border-frame--md">
        <h2>Subpages</h2>
        <ul className="plain-list">
          <li>
            <Link to={`/editions/${editionId}/teams`}>Teams</Link>
          </li>
          <li>
            <Link to={`/editions/${editionId}/players`}>Players</Link>
          </li>
          <li>
            <Link to={`/editions/${editionId}/phases`}>Phases</Link>
          </li>
          <li>
            <Link to={`/editions/${editionId}/matches`}>Matches</Link>
          </li>
          <li>
            <Link to={`/editions/${editionId}/events`}>Dogodki</Link>
          </li>
          <li>
            <Link to={`/editions/${editionId}/finish`}>Zaključek turnirja</Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
