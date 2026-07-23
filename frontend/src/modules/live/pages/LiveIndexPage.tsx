import { Link } from "react-router-dom";
import { useMemo } from "react";
import { PageHeader, StateMessage } from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import type { MatchEventListItem } from "@/modules/matches/services/matchService";
import type { MatchListItem } from "@/modules/matches/services/matchService";
import { eventIcon } from "../eventIcons";
import { isLiveMatchStatus } from "../matchStatuses";
import { publicApi } from "@/modules/public/services/publicApi";

const GOAL_CODES = new Set(["goal", "own_goal", "penalty_scored"]);
const CARD_CODES = new Set(["yellow_card", "red_card", "second_yellow"]);
const FEED_CODES = new Set([...GOAL_CODES, ...CARD_CODES]);

type FeedEvent = {
  id: number;
  minuteLabel: string;
  icon: string;
  player: string;
  side: "home" | "away";
};

function playerLabel(e: MatchEventListItem): string {
  if (e.player_name) return e.player_name;
  if (e.is_temporary_player && e.temporary_player_label) {
    return e.temporary_player_label;
  }
  return "—";
}

/** Side that matches the scoreboard (own goal credits the opponent). */
function displaySide(
  e: MatchEventListItem,
  match: MatchListItem,
): FeedEvent["side"] | null {
  const homeId = match.home_team_participation;
  const awayId = match.away_team_participation;
  if (homeId == null || awayId == null) return null;

  const onHome = e.team_participation === homeId;
  const onAway = e.team_participation === awayId;
  if (!onHome && !onAway) return null;

  const code = e.event_type?.code;
  const isOwn = Boolean(e.is_own_goal || code === "own_goal");
  const isGoal = isOwn || (code != null && GOAL_CODES.has(code));

  if (isGoal && isOwn) {
    // Own goal by home → away score; show under away (beneficiary).
    return onHome ? "away" : "home";
  }
  return onHome ? "home" : "away";
}

function toFeedEvent(
  e: MatchEventListItem,
  match: MatchListItem,
): FeedEvent | null {
  const side = displaySide(e, match);
  if (!side) return null;
  const code = e.is_own_goal ? "own_goal" : e.event_type?.code;
  return {
    id: e.id,
    minuteLabel:
      e.extra_minute != null
        ? `${e.minute}+${e.extra_minute}'`
        : `${e.minute}'`,
    icon: eventIcon(code) || "•",
    player: playerLabel(e),
    side,
  };
}

function EventColumn({
  events,
  side,
}: {
  events: FeedEvent[];
  side: "home" | "away";
}) {
  if (events.length === 0) {
    return <div className={`live-index-card__col live-index-card__col--${side}`} />;
  }
  return (
    <ul
      className={`live-index-card__col live-index-card__col--${side} live-index-card__events`}
    >
      {events.map((ev) => (
        <li key={ev.id} className="live-index-card__event">
          {side === "home" ? (
            <>
              <span className="live-index-card__event-player">{ev.player}</span>
              <span className="live-index-card__event-icon" aria-hidden>
                {ev.icon}
              </span>
              <span className="live-index-card__event-min">{ev.minuteLabel}</span>
            </>
          ) : (
            <>
              <span className="live-index-card__event-min">{ev.minuteLabel}</span>
              <span className="live-index-card__event-icon" aria-hidden>
                {ev.icon}
              </span>
              <span className="live-index-card__event-player">{ev.player}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function LiveIndexPage() {
  const list = useAsyncData(async () => {
    const page = await publicApi.listMatches({ page_size: 100 });
    return page.results.filter((m) => isLiveMatchStatus(m.status?.code));
  }, []);

  const eventsByMatch = useAsyncData(async () => {
    if (!list.data?.length) {
      return new Map<number, { home: FeedEvent[]; away: FeedEvent[] }>();
    }
    const map = new Map<number, { home: FeedEvent[]; away: FeedEvent[] }>();
    await Promise.all(
      list.data.map(async (m) => {
        const ev = await publicApi.listEvents({ match: m.id, page_size: 40 });
        const feed = [...ev.results]
          .filter((e) => {
            const code = e.is_own_goal ? "own_goal" : e.event_type?.code;
            return code != null && FEED_CODES.has(code);
          })
          .sort((a, b) => {
            if (a.minute !== b.minute) return b.minute - a.minute;
            return (b.extra_minute ?? 0) - (a.extra_minute ?? 0);
          })
          .map((e) => toFeedEvent(e, m))
          .filter((e): e is FeedEvent => e != null)
          .slice(0, 8);

        map.set(m.id, {
          home: feed.filter((e) => e.side === "home"),
          away: feed.filter((e) => e.side === "away"),
        });
      }),
    );
    return map;
  }, [list.data]);

  const rows = useMemo(() => list.data ?? [], [list.data]);

  return (
    <div className="page">
      <PageHeader title="Live" />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {list.error ? (
        <StateMessage variant="error" message={list.error.message} />
      ) : null}
      {!list.loading && rows.length === 0 ? (
        <StateMessage
          variant="empty"
          title="Ni live tekem"
          message="Ko se tekma začne, se prikaže tukaj."
        />
      ) : null}

      <div className="live-index-stack">
        {rows.map((match) => {
          const split = eventsByMatch.data?.get(match.id) ?? {
            home: [],
            away: [],
          };
          const hasEvents = split.home.length > 0 || split.away.length > 0;
          const href = `/live/matches/${match.id}`;
          return (
            <Link
              key={match.id}
              to={href}
              className="live-index-card border-frame border-frame--md"
            >
              <div className="live-index-card__top">
                <div className="live-index-card__meta">
                  {match.edition_name ? (
                    <span className="live-index-card__edition">
                      {match.edition_name}
                    </span>
                  ) : null}
                  {match.status?.name || match.phase_name ? (
                    <span className="muted live-index-card__phase">
                      {[match.status?.name, match.phase_name || match.group_name]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </div>
                <span className="public-live-pill">LIVE</span>
              </div>

              <div className="live-index-card__scoreboard">
                <span className="live-index-card__team live-index-card__team--home">
                  {match.home_team_name ?? "Home"}
                </span>
                <span className="live-index-card__score">
                  {match.home_score ?? 0}
                  <span className="live-index-card__score-sep">:</span>
                  {match.away_score ?? 0}
                </span>
                <span className="live-index-card__team live-index-card__team--away">
                  {match.away_team_name ?? "Away"}
                </span>
              </div>

              {hasEvents ? (
                <div className="live-index-card__feed">
                  <EventColumn events={split.home} side="home" />
                  <EventColumn events={split.away} side="away" />
                </div>
              ) : (
                <p className="muted live-index-card__empty-events">
                  Še ni golov ali kartonov
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
