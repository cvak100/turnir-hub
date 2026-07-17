import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { editionService } from "@/modules/editions/services/editionService";
import { tournamentService } from "../services/tournamentService";

export function TournamentDetailPage() {
  const { id } = useParams();
  const tournamentId = Number(id);
  const { hasPermission, user } = useAuth();

  const tournament = useAsyncData(
    () => tournamentService.get(tournamentId),
    [tournamentId],
  );
  const editions = useAsyncData(
    () => editionService.list({ tournament: tournamentId }),
    [tournamentId],
  );

  if (!Number.isFinite(tournamentId)) {
    return <StateMessage variant="error" message="Invalid tournament id." />;
  }

  return (
    <div className="page">
      <PageHeader
        title={tournament.data?.name ?? "Tournament"}
        subtitle={tournament.data?.description || "Tournament detail"}
        actions={
          user && hasPermission("tournament.edit") ? (
            <Link
              className="button-link"
              to={`/tournaments/${tournamentId}/edit`}
            >
              Edit
            </Link>
          ) : null
        }
      />
      <ErrorBanner error={tournament.error ?? editions.error} />
      {tournament.loading ? <StateMessage variant="loading" /> : null}
      {tournament.data ? (
        <section className="panel">
          <ul className="plain-list">
            <li>Sport: {tournament.data.sport?.name ?? "—"}</li>
            <li>Active: {tournament.data.is_active ? "yes" : "no"}</li>
            <li>Id: {tournament.data.id}</li>
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <h2>Editions</h2>
        {editions.loading ? <StateMessage variant="loading" /> : null}
        {!editions.loading && editions.data?.results.length === 0 ? (
          <StateMessage variant="empty" message="No editions linked yet." />
        ) : null}
        {editions.data && editions.data.results.length > 0 ? (
          <ul className="plain-list">
            {editions.data.results.map((edition) => (
              <li key={edition.id}>
                <Link to={`/editions/${edition.id}`}>
                  {edition.name} ({edition.year})
                </Link>{" "}
                · {edition.status?.name ?? edition.status?.code}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
