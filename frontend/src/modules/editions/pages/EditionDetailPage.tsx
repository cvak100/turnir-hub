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

function personLabel(p: {
  player?: { person?: { first_name?: string; last_name?: string; nickname?: string } };
}): string {
  const person = p.player?.person;
  if (!person) return "—";
  const full = `${person.last_name ?? ""} ${person.first_name ?? ""}`.trim();
  return full || person.nickname || "—";
}

export function EditionDetailPage() {
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

  if (!Number.isFinite(editionId)) {
    return <StateMessage variant="error" message="Neveljaven id edicije." />;
  }

  const loading =
    edition.loading ||
    phases.loading ||
    matches.loading ||
    teams.loading ||
    players.loading;
  const error =
    edition.error ??
    phases.error ??
    matches.error ??
    teams.error ??
    players.error ??
    standings.error ??
    awards.error;

  const matchRows = matches.data?.results ?? [];
  const liveMatches = matchRows.filter((m) => isLiveMatchStatus(m.status?.code));
  const standingRows = normalizeList(standings.data);
  const awardRows = normalizeList(awards.data);
  const isFinished = edition.data?.status?.code === "finished";

  const topScorers = [...(players.data?.results ?? [])]
    .filter((p) => (p.goals ?? 0) > 0)
    .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))
    .slice(0, 10);

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

      <section id="phases" className="border-frame border-frame--md">
        <h2>Faze / skupine</h2>
        {(phases.data?.results.length ?? 0) === 0 ? (
          <p className="muted">Ni faz.</p>
        ) : (
          <ul className="plain-list">
            {phases.data?.results.map((ph) => (
              <li key={ph.id}>
                {ph.order}. {ph.name}{" "}
                <span className="muted">({ph.phase_type} · {ph.status})</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="schedule" className="border-frame border-frame--md">
        <h2>Urnik tekem</h2>
        {matchRows.length === 0 ? (
          <p className="muted">Ni tekem.</p>
        ) : (
          <ul className="plain-list">
            {matchRows.map((m) => (
              <li key={m.id}>
                <Link to={`/matches/${m.id}`}>
                  {m.home_team_name ?? "TBD"} vs {m.away_team_name ?? "TBD"}
                  {m.home_score != null && m.away_score != null
                    ? ` ${m.home_score}:${m.away_score}`
                    : ""}
                </Link>
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

      <section id="players" className="border-frame border-frame--md">
        <h2>Igralci</h2>
        {(players.data?.results.length ?? 0) === 0 ? (
          <p className="muted">Ni igralcev.</p>
        ) : (
          <ul className="plain-list">
            {players.data?.results.slice(0, 40).map((p) => (
              <li key={p.id}>
                {personLabel(p)}
                {p.team_name || p.participation_name
                  ? ` · ${p.team_name ?? p.participation_name}`
                  : ""}
                {p.jersey_number != null ? ` · #${p.jersey_number}` : ""}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link to="/persons">Vsi igralci / osebe</Link>
        </p>
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

      <section id="stats" className="border-frame border-frame--md">
        <h2>Statistika (ta edicija)</h2>
        {topScorers.length === 0 ? (
          <p className="muted">Še ni gola / statistik.</p>
        ) : (
          <ul className="plain-list">
            {topScorers.map((p) => (
              <li key={p.id}>
                {personLabel(p)} — {p.goals} golov
                {p.assists ? `, ${p.assists} asistenc` : ""}
              </li>
            ))}
          </ul>
        )}
        <p>
          <Link to={`/stats?edition=${editionId}`}>Odpri statistiko</Link>
        </p>
      </section>

      <section id="standings" className="border-frame border-frame--md">
        <h2>{isFinished ? "Končna lestvica" : "Lestvica"}</h2>
        {standingRows.length === 0 ? (
          <p className="muted">Lestvica še ni objavljena.</p>
        ) : (
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
        )}
      </section>

      <section className="border-frame border-frame--md">
        <h2>Live</h2>
        {liveMatches.length === 0 ? (
          <p className="muted">Trenutno ni live tekem te edicije.</p>
        ) : (
          <ul className="plain-list">
            {liveMatches.map((m) => (
              <li key={m.id}>
                <Link to={`/matches/${m.id}`}>
                  {m.home_team_name} {m.home_score ?? 0}:{m.away_score ?? 0}{" "}
                  {m.away_team_name}
                </Link>
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
