import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { publicApi } from "@/modules/public/services/publicApi";
import { EditionPublicNav } from "../publicEdition.tsx";

function formatRegistered(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function EditionPublicTeamsPage() {
  const { id } = useParams();
  const editionId = Number(id);

  const edition = useAsyncData(
    () => publicApi.getEdition(editionId),
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

  const playerCountByParticipation = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of players.data?.results ?? []) {
      map.set(
        p.team_participation,
        (map.get(p.team_participation) ?? 0) + 1,
      );
    }
    return map;
  }, [players.data]);

  const rows = useMemo(() => {
    return [...(teams.data?.results ?? [])].sort((a, b) =>
      (a.participation_name || a.team?.name || "").localeCompare(
        b.participation_name || b.team?.name || "",
        "sl",
      ),
    );
  }, [teams.data]);

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading = edition.loading || teams.loading;
  const error = edition.error ?? teams.error;

  return (
    <div className="page">
      <PageHeader
        title="Ekipe"
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
        {rows.length === 0 ? (
          <p className="muted">Ni ekip.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table edition-public-table">
              <thead>
                <tr>
                  <th>Ekipa</th>
                  <th>Klub</th>
                  <th>Kraj</th>
                  <th>Igralci</th>
                  <th>Registracija</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      {t.team?.id ? (
                        <Link
                          className="edition-entity-link"
                          to={`/teams/${t.team.id}`}
                        >
                          {t.participation_name || t.team.name}
                        </Link>
                      ) : (
                        t.participation_name
                      )}
                    </td>
                    <td className="muted">{t.team?.name || "—"}</td>
                    <td className="muted">{t.team?.city || "—"}</td>
                    <td>{playerCountByParticipation.get(t.id) ?? 0}</td>
                    <td className="muted">
                      {formatRegistered(t.registered_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
