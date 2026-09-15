import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { isLiveMatchStatus } from "@/modules/live/matchStatuses";
import {
  normalizeList,
  publicApi,
} from "@/modules/public/services/publicApi";
import { EditionPublicNav, matchLabel } from "../publicEdition.tsx";
import { EditionManageNav } from "../EditionManageNav";

export function EditionDetailPage() {
  const { id } = useParams();
  const editionId = Number(id);

  const edition = useAsyncData(
    () => publicApi.getEdition(editionId),
    [editionId],
  );
  const matches = useAsyncData(
    () => publicApi.listMatches({ tournament_edition: editionId }),
    [editionId],
  );
  const awards = useAsyncData(
    () => publicApi.listAwards(editionId),
    [editionId],
  );

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading = edition.loading || matches.loading;
  const error = edition.error ?? matches.error ?? awards.error;
  const matchRows = matches.data?.results ?? [];
  const liveMatches = matchRows.filter((m) =>
    isLiveMatchStatus(m.status?.code),
  );
  const awardRows = normalizeList(awards.data);
  const isFinished = edition.data?.status?.code === "finished";

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
      <EditionPublicNav editionId={editionId} />
      <EditionManageNav editionId={editionId} />
      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" /> : null}

      {edition.data ? (
        <section className="border-frame border-frame--md">
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

      <section className="border-frame border-frame--md">
        <h2>Nagrade in priznanja</h2>
        {awards.loading ? <StateMessage variant="loading" /> : null}
        {!awards.loading && awardRows.length === 0 ? (
          <p className="muted">
            {isFinished
              ? "Ni vpisanih nagrad."
              : "Nagrade se prikažejo predvsem po zaključku."}
          </p>
        ) : null}
        {awardRows.length > 0 ? (
          <ul className="plain-list">
            {awardRows.map((a) => (
              <li key={a.id}>
                <strong>{a.award?.name}</strong>
                {a.player_name ? ` — ${a.player_name}` : ""}
                {a.team_name ? ` (${a.team_name})` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
