import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { isLiveMatchStatus } from "@/modules/live/matchStatuses";
import { useMatchWebSocket } from "@/modules/live/hooks/useMatchWebSocket";
import { publicApi } from "@/modules/public/services/publicApi";
import { useCallback, useState } from "react";
import type { MatchDetail } from "@/modules/matches/services/matchService";
import type { MatchEventListItem } from "@/modules/matches/services/matchService";

function eventLabel(ev: MatchEventListItem): string {
  const who =
    ev.player_name ||
    (ev.is_temporary_player ? ev.temporary_player_label : null) ||
    "—";
  const min =
    ev.extra_minute != null ? `${ev.minute}+${ev.extra_minute}'` : `${ev.minute}'`;
  return `${min} ${ev.event_type?.name ?? ev.event_type?.code ?? "dogodek"} — ${who}`;
}

export function PublicMatchPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<MatchEventListItem[]>([]);

  const boot = useAsyncData(async () => {
    if (!Number.isFinite(matchId)) throw new Error("Neveljaven id tekme.");
    const [m, ev] = await Promise.all([
      publicApi.getMatch(matchId),
      publicApi.listEvents({ match: matchId, page_size: 500 }),
    ]);
    setMatch(m);
    setEvents(
      [...ev.results].sort((a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute;
        return (a.extra_minute ?? 0) - (b.extra_minute ?? 0);
      }),
    );
    return m;
  }, [matchId]);

  const onMessage = useCallback(
    (message: {
      match_id: number;
      score: {
        home: number | null;
        away: number | null;
        home_penalties?: number | null;
        away_penalties?: number | null;
      };
      status: string | null;
      event: {
        id: number;
        event_type: string;
        minute: number;
        extra_minute: number | null;
        half?: string;
        team_participation_id: number;
        player_id: number | null;
        is_temporary_player: boolean;
        temporary_player_label: string;
        related_player_id: number | null;
      } | null;
    }) => {
      setMatch((prev) =>
        prev
          ? {
              ...prev,
              home_score: message.score.home,
              away_score: message.score.away,
              home_score_penalties: message.score.home_penalties ?? prev.home_score_penalties,
              away_score_penalties: message.score.away_penalties ?? prev.away_score_penalties,
              status: message.status
                ? { ...prev.status, code: message.status, name: message.status }
                : prev.status,
            }
          : prev,
      );
      if (message.event) {
        void publicApi.listEvents({ match: matchId, page_size: 500 }).then((ev) => {
          setEvents(
            [...ev.results].sort((a, b) => {
              if (a.minute !== b.minute) return a.minute - b.minute;
              return (a.extra_minute ?? 0) - (b.extra_minute ?? 0);
            }),
          );
        });
      }
    },
    [matchId],
  );

  useMatchWebSocket({
    matchId,
    enabled: Number.isFinite(matchId) && Boolean(match),
    onMessage,
  });

  if (!Number.isFinite(matchId)) {
    return <StateMessage variant="error" message="Neveljaven id tekme." />;
  }

  const live = isLiveMatchStatus(match?.status?.code);

  return (
    <div className="page">
      <PageHeader
        title={
          match
            ? `${match.home_team_name ?? "TBD"} vs ${match.away_team_name ?? "TBD"}`
            : "Tekma"
        }
        subtitle={
          match
            ? `${match.edition_name ?? ""} · ${match.status?.name ?? match.status?.code ?? ""}`
            : "Javni pregled"
        }
        actions={
          match?.edition_id ? (
            <Link
              className="button-link border-frame border-frame--sm"
              to={`/editions/${match.edition_id}`}
            >
              Edicija
            </Link>
          ) : null
        }
      />
      <ErrorBanner error={boot.error} />
      {boot.loading ? <StateMessage variant="loading" /> : null}

      {match ? (
        <>
          <section className="border-frame border-frame--md public-match-score">
            <p className="public-match-score__line">
              <strong>
                {match.home_score ?? 0}:{match.away_score ?? 0}
              </strong>
              {live ? <span className="public-live-pill">LIVE</span> : null}
            </p>
            {match.is_penalties ? (
              <p className="muted">
                Penali: {match.home_score_penalties ?? 0}:
                {match.away_score_penalties ?? 0}
              </p>
            ) : null}
            {match.match_date ? (
              <p className="muted">
                {new Date(match.match_date).toLocaleString()}
              </p>
            ) : null}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Dogodki</h2>
            {events.length === 0 ? (
              <p className="muted">Še ni dogodkov.</p>
            ) : (
              <ul className="plain-list">
                {events.map((ev) => (
                  <li key={ev.id}>{eventLabel(ev)}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Sestava</h2>
            <p className="muted">
              Sestave (lineup) se prikažejo, ko so na voljo v sistemu. Trenutno
              glej igralce na{" "}
              {match.edition_id ? (
                <Link to={`/editions/${match.edition_id}#players`}>ediciji</Link>
              ) : (
                "ediciji"
              )}
              .
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
