import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { formatPersonName } from "@/shared/utils/format";
import { eventLabelWithIcon } from "@/modules/live/eventIcons";
import { halfDisplayLabel } from "@/modules/live/matchStatuses";
import {
  matchEventService,
} from "@/modules/matches/services/matchService";
import { PlayerCareerChart } from "../components/PlayerCareerChart";
import {
  participationPlayerService,
  playerService,
} from "../services/playerService";

function displayName(
  person: {
    first_name: string;
    last_name: string;
    nickname: string;
    show_as_anonymous?: boolean;
  },
): string {
  if (person.show_as_anonymous) return "Anonimni igralec";
  return formatPersonName(person);
}

function footLabel(foot: string): string {
  const f = foot.trim().toLowerCase();
  if (f === "left" || f === "l") return "Leva";
  if (f === "right" || f === "r") return "Desna";
  if (f === "both") return "Obe";
  return foot || "—";
}

function genderLabel(g: string | undefined): string {
  if (!g) return "—";
  if (g === "male") return "Moški";
  if (g === "female") return "Ženska";
  if (g === "other") return "Drugo";
  return g;
}

export function PlayerDetailPage() {
  const { id } = useParams();
  const playerId = Number(id);
  const { hasPermission, isAdmin } = useAuth();

  const player = useAsyncData(() => playerService.get(playerId), [playerId]);
  const assignments = useAsyncData(
    () =>
      participationPlayerService.list({
        player: playerId,
        page_size: 100,
        ordering: "-created_at",
      }),
    [playerId],
  );
  const events = useAsyncData(
    () =>
      matchEventService.list({
        player: playerId,
        page_size: 100,
        ordering: "-created_at",
      }),
    [playerId],
  );

  const canEdit = isAdmin || hasPermission("player.manage");

  const stats = useMemo(() => {
    const list = assignments.data?.results ?? [];
    return {
      goals: list.reduce((s, r) => s + (r.goals || 0), 0),
      assists: list.reduce((s, r) => s + (r.assists || 0), 0),
      matches: list.reduce((s, r) => s + (r.matches_played || 0), 0),
      yellow: list.reduce((s, r) => s + (r.yellow_cards || 0), 0),
      red: list.reduce((s, r) => s + (r.red_cards || 0), 0),
      minutes: list.reduce((s, r) => s + (r.minutes_played || 0), 0),
      teams: list.length,
    };
  }, [assignments.data]);

  const yearPoints = useMemo(() => {
    const map = new Map<
      number,
      {
        year: number;
        matches: number;
        goals: number;
        assists: number;
        yellow: number;
        red: number;
      }
    >();
    for (const row of assignments.data?.results ?? []) {
      const year = row.tournament_edition_year;
      if (year == null) continue;
      const cur = map.get(year) ?? {
        year,
        matches: 0,
        goals: 0,
        assists: 0,
        yellow: 0,
        red: 0,
      };
      cur.matches += row.matches_played ?? 0;
      cur.goals += row.goals || 0;
      cur.assists += row.assists || 0;
      cur.yellow += row.yellow_cards || 0;
      cur.red += row.red_cards || 0;
      map.set(year, cur);
    }
    return [...map.values()];
  }, [assignments.data]);

  const matchesByEdition = useMemo(() => {
    const map = new Map<
      number,
      { id: number; label: string }[]
    >();
    const seen = new Map<number, Set<number>>();
    for (const ev of events.data?.results ?? []) {
      const ed = ev.tournament_edition_id;
      if (ed == null) continue;
      if (!seen.has(ed)) seen.set(ed, new Set());
      if (seen.get(ed)!.has(ev.match)) continue;
      seen.get(ed)!.add(ev.match);
      const label = `${ev.home_team_name ?? "?"} vs ${ev.away_team_name ?? "?"}`;
      const list = map.get(ed) ?? [];
      list.push({ id: ev.match, label });
      map.set(ed, list);
    }
    return map;
  }, [events.data]);

  if (!Number.isFinite(playerId)) {
    return <StateMessage variant="error" message="Neveljaven igralec." />;
  }

  const p = player.data;
  const person = p?.person;
  const photo = p?.photo || person?.photo || null;
  const title = p && person ? displayName(person) : "Igralec";

  return (
    <div className="page player-profile">
      <PageHeader
        title={title}
        subtitle={
          p
            ? [p.position, p.current_club || null, p.nationality || person?.nationality_name]
                .filter(Boolean)
                .join(" · ") || "Profil igralca"
            : "Profil igralca"
        }
        actions={
          <>
            {canEdit ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to={`/players/${playerId}/edit`}
              >
                Uredi
              </Link>
            ) : null}
            <Link
              className="button-link border-frame border-frame--sm"
              to="/players"
            >
              Seznam
            </Link>
          </>
        }
      />

      <ErrorBanner
        error={player.error ?? assignments.error ?? events.error}
      />
      {player.loading ? <StateMessage variant="loading" /> : null}

      {p && person ? (
        <>
          <section className="border-frame border-frame--lg player-hero">
            <div className="player-hero__media">
              {photo ? (
                <img
                  className="player-hero__photo"
                  src={photo}
                  alt={title}
                />
              ) : (
                <div className="player-hero__placeholder" aria-hidden>
                  {(person.last_name || person.first_name || "?").slice(0, 1)}
                </div>
              )}
              {p.preferred_jersey_number != null ? (
                <span className="player-hero__jersey border-frame border-frame--sm">
                  #{p.preferred_jersey_number}
                </span>
              ) : null}
            </div>
            <div className="player-hero__body">
              <p className="player-hero__name">{title}</p>
              {person.nickname && !person.show_as_anonymous ? (
                <p className="player-hero__nick">„{person.nickname}”</p>
              ) : null}
              <p className="player-hero__meta muted">
                {[p.position || null, p.secondary_position || null]
                  .filter(Boolean)
                  .join(" / ") || "Brez pozicije"}
                {p.status?.name ? ` · ${p.status.name}` : ""}
                {p.is_active ? "" : " · Neaktiven"}
              </p>
              {(p.biography || person.bio) ? (
                <p className="player-hero__bio">
                  {p.biography || person.bio}
                </p>
              ) : null}
            </div>
          </section>

          <section className="player-stats border-frame border-frame--md">
            <h2>Statistika</h2>
            <div className="player-stats__grid">
              <div className="player-stat">
                <span className="player-stat__value">{stats.matches}</span>
                <span className="player-stat__label">Tekme</span>
              </div>
              <div className="player-stat">
                <span className="player-stat__value">{stats.goals}</span>
                <span className="player-stat__label">Goli</span>
              </div>
              <div className="player-stat">
                <span className="player-stat__value">{stats.assists}</span>
                <span className="player-stat__label">Asistence</span>
              </div>
              <div className="player-stat">
                <span className="player-stat__value">{stats.yellow}</span>
                <span className="player-stat__label">Rumene</span>
              </div>
              <div className="player-stat">
                <span className="player-stat__value">{stats.red}</span>
                <span className="player-stat__label">Rdeče</span>
              </div>
              <div className="player-stat">
                <span className="player-stat__value">{stats.minutes}</span>
                <span className="player-stat__label">Minute</span>
              </div>
            </div>
          </section>

          {yearPoints.length > 0 ? (
            <section className="border-frame border-frame--md">
              <h2>Skozi leta</h2>
              <p className="muted">
                Nastopi, goli, asistence in kartoni po letih edicij.
              </p>
              <PlayerCareerChart points={yearPoints} />
            </section>
          ) : null}

          <div className="player-columns">
            <section className="border-frame border-frame--md">
              <h2>Osebni podatki</h2>
              <dl className="player-dl">
                <div>
                  <dt>Rojstvo</dt>
                  <dd>
                    {person.date_of_birth || "—"}
                    {person.place_of_birth
                      ? ` · ${person.place_of_birth}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Spol</dt>
                  <dd>{genderLabel(person.gender)}</dd>
                </div>
                <div>
                  <dt>Državljanstvo</dt>
                  <dd>
                    {p.nationality ||
                      person.nationality_name ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt>Kraj</dt>
                  <dd>
                    {[person.city, person.country].filter(Boolean).join(", ") ||
                      "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border-frame border-frame--md">
              <h2>Igralski profil</h2>
              <dl className="player-dl">
                <div>
                  <dt>Višina</dt>
                  <dd>{p.height_cm != null ? `${p.height_cm} cm` : "—"}</dd>
                </div>
                <div>
                  <dt>Teža</dt>
                  <dd>{p.weight_kg != null ? `${p.weight_kg} kg` : "—"}</dd>
                </div>
                <div>
                  <dt>Dominantna noga</dt>
                  <dd>{footLabel(p.dominant_foot)}</dd>
                </div>
                <div>
                  <dt>Klub</dt>
                  <dd>{p.current_club || "—"}</dd>
                </div>
                <div>
                  <dt>Pogodba do</dt>
                  <dd>{p.contract_until || "—"}</dd>
                </div>
                <div>
                  <dt>Dres</dt>
                  <dd>
                    {p.preferred_jersey_number != null
                      ? `#${p.preferred_jersey_number}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="border-frame border-frame--md">
            <h2>Zgodovina ekip</h2>
            {assignments.loading ? (
              <StateMessage variant="loading" />
            ) : null}
            {!assignments.loading &&
            (assignments.data?.results.length ?? 0) === 0 ? (
              <p className="muted">Ni prijav na ekipah.</p>
            ) : null}
            {(assignments.data?.results.length ?? 0) > 0 ? (
              <ul className="player-history">
                {(assignments.data?.results ?? []).map((row) => {
                  const editionMatches =
                    row.tournament_edition_id != null
                      ? (matchesByEdition.get(row.tournament_edition_id) ?? [])
                      : [];
                  return (
                    <li key={row.id} className="player-history__item">
                      <div className="player-history__main">
                        <strong>
                          {row.participation_name || row.team_name || "Ekipa"}
                        </strong>
                        <span className="muted">
                          {" "}
                          ·{" "}
                          {row.tournament_edition_name
                            ? `${row.tournament_edition_name}${
                                row.tournament_edition_year
                                  ? ` (${row.tournament_edition_year})`
                                  : ""
                              }`
                            : "Edicija"}
                        </span>
                      </div>
                      <div className="player-history__meta muted">
                        {row.jersey_number != null
                          ? `#${row.jersey_number}`
                          : "—"}
                        {" · "}
                        {row.position || "—"}
                        {row.is_captain ? " · Kapetan" : ""}
                        {row.is_vice_captain ? " · Podkapetan" : ""}
                        {" · "}
                        {row.matches_played ?? 0} tekme · {row.goals}G ·{" "}
                        {row.assists}A
                      </div>
                      {editionMatches.length > 0 ? (
                        <ul className="player-history__matches">
                          {editionMatches.map((m) => (
                            <li key={m.id}>
                              <Link
                                className="linkish"
                                to={`/matches/${m.id}`}
                              >
                                {m.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted player-history__matches-empty">
                          Ni tekem z dogodki.
                        </p>
                      )}
                      {row.tournament_edition_id != null ? (
                        <Link
                          className="linkish"
                          to={`/editions/${row.tournament_edition_id}/matches`}
                        >
                          Vse tekme edicije
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Zgodovina dogodkov</h2>
            {events.loading ? <StateMessage variant="loading" /> : null}
            {!events.loading && (events.data?.results.length ?? 0) === 0 ? (
              <p className="muted">Ni zabeleženih dogodkov.</p>
            ) : null}
            {(events.data?.results.length ?? 0) > 0 ? (
              <ul className="player-history">
                {(events.data?.results ?? []).map((ev) => (
                  <li key={ev.id} className="player-history__item">
                    <Link
                      className="player-history__link"
                      to={`/matches/${ev.match}`}
                    >
                      <div className="player-history__main">
                        <strong>
                          {ev.minute}
                          {ev.extra_minute != null
                            ? `+${ev.extra_minute}`
                            : ""}
                          '
                        </strong>{" "}
                        · {halfDisplayLabel(ev.half)} ·{" "}
                        {eventLabelWithIcon(
                          ev.event_type.code,
                          ev.event_type.name,
                        )}
                        {ev.is_own_goal ? " (AG)" : ""}
                      </div>
                      <div className="player-history__meta muted">
                        {ev.home_team_name ?? "?"} vs{" "}
                        {ev.away_team_name ?? "?"}
                        {ev.team_name ? ` · ${ev.team_name}` : ""}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
