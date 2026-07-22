import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import {
  matchEventService,
  matchService,
  type MatchDetail,
  type MatchEventListItem,
} from "@/modules/matches/services/matchService";
import {
  participationPlayerService,
  type TeamParticipationPlayerListItem,
} from "@/modules/players/services/playerService";
import { eventIcon, eventLabelWithIcon } from "../eventIcons";
import {
  playerLabel,
  sortEventsForTimeline,
} from "../components/LiveEventEditor";
import {
  eventHalfForStatus,
  halfDisplayLabel,
  halfSortKey,
  isFinishedMatchStatus,
  isLiveMatchStatus,
} from "../matchStatuses";
import {
  useMatchWebSocket,
  type MatchUpdateMessage,
} from "../hooks/useMatchWebSocket";
import { upsertEventFromWs } from "../services/liveService";

export function LiveMatchPage() {
  const { id } = useParams();
  const matchId = Number(id);

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<MatchEventListItem[]>([]);
  const [homeRoster, setHomeRoster] = useState<TeamParticipationPlayerListItem[]>(
    [],
  );
  const [awayRoster, setAwayRoster] = useState<TeamParticipationPlayerListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const statusCode = match?.status?.code ?? "";
  const half = eventHalfForStatus(statusCode);
  const isLive = isLiveMatchStatus(statusCode);
  const isFinished = isFinishedMatchStatus(statusCode);
  const inPenalties =
    statusCode === "match_penalties" || match?.is_penalties === true;

  const loadAll = useCallback(async () => {
    const [matchData, eventsData] = await Promise.all([
      matchService.get(matchId),
      matchEventService.list({ match: matchId, page_size: 500 }),
    ]);
    setMatch(matchData);
    setEvents(eventsData.results);

    const [home, away] = await Promise.all([
      matchData.home_team_participation
        ? participationPlayerService.list({
            team_participation: matchData.home_team_participation,
            page_size: 100,
          })
        : Promise.resolve({ results: [] as TeamParticipationPlayerListItem[] }),
      matchData.away_team_participation
        ? participationPlayerService.list({
            team_participation: matchData.away_team_participation,
            page_size: 100,
          })
        : Promise.resolve({ results: [] as TeamParticipationPlayerListItem[] }),
    ]);
    setHomeRoster(home.results);
    setAwayRoster(away.results);
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadAll()
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  const onWsMessage = useCallback(
    (message: MatchUpdateMessage) => {
      setMatch((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          home_score: message.score.home,
          away_score: message.score.away,
          home_score_penalties:
            message.score.home_penalties ?? prev.home_score_penalties,
          away_score_penalties:
            message.score.away_penalties ?? prev.away_score_penalties,
          is_penalties: message.is_penalties ?? prev.is_penalties,
          status: message.status
            ? { ...prev.status, code: message.status, name: message.status }
            : prev.status,
        };
      });

      if (message.event == null) {
        void matchEventService
          .list({ match: matchId, page_size: 500 })
          .then((res) => setEvents(res.results));
        return;
      }
      setEvents((prev) => upsertEventFromWs(prev, message));
    },
    [matchId],
  );

  const onReconnect = useCallback(() => {
    void loadAll().catch(setError);
  }, [loadAll]);

  useMatchWebSocket({
    matchId,
    enabled: Number.isFinite(matchId),
    onMessage: onWsMessage,
    onReconnect,
  });

  const homeEvents = useMemo(
    () =>
      sortEventsForTimeline(
        events.filter(
          (e) => e.team_participation === match?.home_team_participation,
        ),
      ),
    [events, match?.home_team_participation],
  );
  const awayEvents = useMemo(
    () =>
      sortEventsForTimeline(
        events.filter(
          (e) => e.team_participation === match?.away_team_participation,
        ),
      ),
    [events, match?.away_team_participation],
  );

  const shootoutEvents = useMemo(
    () => sortEventsForTimeline(events.filter((e) => e.half === "penalties")),
    [events],
  );

  const playerNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of [...homeRoster, ...awayRoster]) {
      map.set(row.player.id, playerLabel(row.player.person));
    }
    return map;
  }, [homeRoster, awayRoster]);

  function eventActorLabel(event: MatchEventListItem): string {
    if (event.is_temporary_player) {
      return event.temporary_player_label || "Neznani";
    }
    if (event.player != null) {
      return playerNameById.get(event.player) ?? `Igralec #${event.player}`;
    }
    return "—";
  }

  const lastMinute = useMemo(() => {
    const regular = events.filter((e) => e.half !== "penalties");
    if (regular.length === 0) return null;
    return Math.max(...regular.map((e) => e.minute));
  }, [events]);

  if (!Number.isFinite(matchId)) {
    return <StateMessage variant="error" message="Neveljaven id tekme." />;
  }

  return (
    <div className="page live-edit-page">
      <PageHeader
        title={
          match
            ? `${match.home_team_name ?? "TBD"} vs ${match.away_team_name ?? "TBD"}`
            : "Live tekma"
        }
        subtitle={
          isLive ? "V živo" : isFinished ? "Končana" : match?.status?.name || "Tekma"
        }
        actions={
          <>
            {match?.edition_id ? (
              <Link
                className="button-link border-frame border-frame--sm"
                to={`/editions/${match.edition_id}`}
              >
                Edicija
              </Link>
            ) : null}
            <Link
              className="button-link border-frame border-frame--sm"
              to="/live"
            >
              Live
            </Link>
          </>
        }
      />

      <ErrorBanner error={error} />
      {loading ? <StateMessage variant="loading" message="Nalagam…" /> : null}

      {match ? (
        <>
          <section className="border-frame border-frame--md live-score-board">
            <div className="live-score-grid">
              <div className="live-score-grid__team live-score-grid__team--home">
                {match.home_team_name ?? "Domači"}
              </div>
              <div className="live-score-grid__score">
                <p className="scoreline">
                  {match.home_score ?? 0}
                  <span className="scoreline__sep">:</span>
                  {match.away_score ?? 0}
                </p>
                {match.is_penalties ||
                (match.home_score_penalties ?? 0) > 0 ||
                (match.away_score_penalties ?? 0) > 0 ? (
                  <p className="live-pen-score">
                    pen. {match.home_score_penalties ?? 0}:
                    {match.away_score_penalties ?? 0}
                  </p>
                ) : null}
                {(match.halftime_home_score != null ||
                  match.halftime_away_score != null) &&
                !match.is_penalties ? (
                  <p className="live-pen-score">
                    polčas {match.halftime_home_score ?? 0}:
                    {match.halftime_away_score ?? 0}
                  </p>
                ) : null}
              </div>
              <div className="live-score-grid__team live-score-grid__team--away">
                {match.away_team_name ?? "Gostje"}
              </div>
            </div>
            {match.status ? (
              <p className="live-match-status">
                {isLive ? (
                  <span className="public-live-pill">LIVE</span>
                ) : (
                  match.status.name || match.status.code
                )}
              </p>
            ) : null}
            {!inPenalties && (isLive || lastMinute != null) ? (
              <div className="live-clock-row">
                <strong className="live-clock">
                  {halfDisplayLabel(half)}
                  {lastMinute != null ? ` · ${lastMinute}'` : ""}
                </strong>
              </div>
            ) : null}
          </section>

          {inPenalties || shootoutEvents.length > 0 ? (
            <section className="border-frame border-frame--md live-shootout">
              <h2 style={{ margin: 0 }}>Penalty shootout</h2>
              <ol className="plain-list">
                {shootoutEvents.map((e) => (
                  <li key={e.id}>
                    #{e.minute}{" "}
                    {e.team_participation === match.home_team_participation
                      ? "Domači"
                      : "Gostje"}{" "}
                    · {eventLabelWithIcon(e.event_type.code, e.event_type.name)}
                  </li>
                ))}
              </ol>
              {shootoutEvents.length === 0 ? (
                <p className="muted">Še ni strelov.</p>
              ) : null}
            </section>
          ) : null}

          <section className="border-frame border-frame--md live-split">
            <h2>Timeline</h2>
            <div className="live-split-heads">
              <h3>{match.home_team_name ?? "Domači"}</h3>
              <h3>{match.away_team_name ?? "Gostje"}</h3>
            </div>
            <SharedTimeline
              homeEvents={homeEvents}
              awayEvents={awayEvents}
              labelFor={eventActorLabel}
            />
          </section>

          <section className="border-frame border-frame--md live-split">
            <h2>Igralci</h2>
            <div className="live-split-heads">
              <h3>{match.home_team_name ?? "Domači"}</h3>
              <h3>{match.away_team_name ?? "Gostje"}</h3>
            </div>
            <div className="live-split__cols live-roster-cols">
              <PublicRosterColumn roster={homeRoster} />
              <PublicRosterColumn roster={awayRoster} />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SharedTimeline({
  homeEvents,
  awayEvents,
  labelFor,
}: {
  homeEvents: MatchEventListItem[];
  awayEvents: MatchEventListItem[];
  labelFor: (e: MatchEventListItem) => string;
}) {
  const halves = useMemo(() => {
    const keys = new Set<string>();
    for (const e of [...homeEvents, ...awayEvents]) {
      if (e.half === "penalties") continue;
      keys.add(e.half || "1");
    }
    return [...keys].sort((a, b) => halfSortKey(a) - halfSortKey(b));
  }, [homeEvents, awayEvents]);

  if (halves.length === 0) {
    return <p className="muted">Ni dogodkov.</p>;
  }

  return (
    <div className="live-timeline-shared">
      {halves.map((half) => {
        const home = homeEvents.filter((e) => (e.half || "1") === half);
        const away = awayEvents.filter((e) => (e.half || "1") === half);
        return (
          <div key={half} className="live-timeline-band">
            <div className="live-timeline-half live-timeline-half--full">
              {halfDisplayLabel(half)}
            </div>
            <div className="live-split__cols">
              <div className="live-timeline-col live-timeline-col--home">
                <HalfEventItems events={home} labelFor={labelFor} />
              </div>
              <div className="live-timeline-col live-timeline-col--away">
                <HalfEventItems events={away} labelFor={labelFor} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HalfEventItems({
  events,
  labelFor,
}: {
  events: MatchEventListItem[];
  labelFor: (e: MatchEventListItem) => string;
}) {
  if (events.length === 0) {
    return <p className="muted live-timeline-empty">—</p>;
  }
  return (
    <ul className="live-timeline-half-events">
      {events.map((e) => (
        <li key={e.id}>
          <strong>
            {e.minute}
            {e.extra_minute != null ? `+${e.extra_minute}` : ""}&apos;
          </strong>{" "}
          {eventIcon(e.event_type.code)}{" "}
          {e.player != null ? (
            <Link className="live-player-link" to={`/players/${e.player}`}>
              {labelFor(e)}
            </Link>
          ) : (
            labelFor(e)
          )}
          {e.is_own_goal ? " (AG)" : ""}
        </li>
      ))}
    </ul>
  );
}

function PublicRosterColumn({
  roster,
}: {
  roster: TeamParticipationPlayerListItem[];
}) {
  return (
    <div>
      {roster.length === 0 ? (
        <p className="muted">Ni igralcev.</p>
      ) : (
        <ul className="live-roster-list">
          {roster.map((row) => (
            <li key={row.id}>
              <Link
                className="live-roster-public live-player-link"
                to={`/players/${row.player.id}`}
              >
                <span className="live-roster-btn__num">
                  {row.jersey_number ?? "—"}
                </span>{" "}
                {playerLabel(row.player.person)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
