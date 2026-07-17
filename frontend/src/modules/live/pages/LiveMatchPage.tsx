import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import {
  matchEventService,
  matchService,
  phaseService,
  type MatchDetail,
  type MatchEventListItem,
} from "@/modules/matches/services/matchService";
import { LiveEventEditor } from "../components/LiveEventEditor";
import {
  useMatchWebSocket,
  type MatchUpdateMessage,
  type WsConnectionStatus,
} from "../hooks/useMatchWebSocket";
import { upsertEventFromWs } from "../services/liveService";

export function LiveMatchPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const { hasPermission } = useAuth();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<MatchEventListItem[]>([]);
  const [editionId, setEditionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const matchData = await matchService.get(matchId);
    const eventsData = await matchEventService.list({ match: matchId });
    const phase = await phaseService.get(matchData.tournament_phase);
    setMatch(matchData);
    setEvents(eventsData.results);
    setEditionId(phase.tournament_edition);
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

  const onWsMessage = useCallback((message: MatchUpdateMessage) => {
    setMatch((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        home_score: message.score.home,
        away_score: message.score.away,
        status: message.status
          ? { ...prev.status, code: message.status, name: message.status }
          : prev.status,
      };
    });

    if (message.event == null) {
      void matchEventService.list({ match: matchId }).then((res) => {
        setEvents(res.results);
      });
      return;
    }

    setEvents((prev) => upsertEventFromWs(prev, message));
  }, [matchId]);

  const onReconnect = useCallback(() => {
    void matchEventService.list({ match: matchId }).then((res) => {
      setEvents(res.results);
    });
    void matchService.get(matchId).then(setMatch);
  }, [matchId]);

  const { status: wsStatus } = useMatchWebSocket({
    matchId,
    enabled: Number.isFinite(matchId),
    onMessage: onWsMessage,
    onReconnect,
  });

  const canAdd = hasPermission("match.event.add", editionId);
  const canEdit = hasPermission("match.event.edit", editionId);
  const canFinish = hasPermission("match.finish", editionId);

  async function finishMatch() {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await matchService.finish(matchId);
      setMatch(updated);
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(matchId)) {
    return <StateMessage variant="error" message="Invalid match id." />;
  }

  return (
    <div className="page">
      <PageHeader
        title="Live match"
        subtitle={
          match
            ? `${match.home_team_name ?? "Home"} vs ${match.away_team_name ?? "Away"}`
            : `Match #${matchId}`
        }
        actions={<Link to={`/matches/${matchId}`}>Match detail</Link>}
      />

      <div className={`ws-status ws-${wsStatus}`}>
        Connection: {statusLabel(wsStatus)}
      </div>

      <ErrorBanner error={actionError ?? error} />
      {loading ? <StateMessage variant="loading" message="Loading match…" /> : null}

      {match ? (
        <section className="panel live-score">
          <p className="scoreline">
            {match.home_score ?? 0} : {match.away_score ?? 0}
          </p>
          <p className="muted">
            Status: {match.status?.code ?? "—"}
            {editionId != null ? (
              <>
                {" "}
                · Edition <Link to={`/editions/${editionId}`}>#{editionId}</Link>
              </>
            ) : null}
          </p>
          {canFinish && match.status?.code === "live" ? (
            <button type="button" onClick={() => void finishMatch()} disabled={busy}>
              {busy ? "Finishing…" : "Finish match"}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="panel">
        <h2>Timeline</h2>
        {events.length === 0 ? (
          <StateMessage variant="empty" message="No events yet." />
        ) : (
          <ol className="timeline">
            {events.map((event) => (
              <li key={event.id}>
                <strong>
                  {event.minute}
                  {event.extra_minute != null ? `+${event.extra_minute}` : ""}&apos;
                </strong>{" "}
                {event.event_type?.code ?? event.event_type?.name}
                {" · "}
                team {event.team_participation}
                {event.is_temporary_player
                  ? ` · ${event.temporary_player_label}`
                  : event.player != null
                    ? ` · player ${event.player}`
                    : ""}
                {event.is_own_goal ? " · OG" : ""}
              </li>
            ))}
          </ol>
        )}
      </section>

      <LiveEventEditor
        matchId={matchId}
        homeParticipationId={match?.home_team_participation ?? null}
        awayParticipationId={match?.away_team_participation ?? null}
        canAdd={canAdd}
        canEdit={canEdit}
        events={events}
        onChanged={() => {
          void loadAll().catch(setActionError);
        }}
      />
    </div>
  );
}

function statusLabel(status: WsConnectionStatus): string {
  switch (status) {
    case "connecting":
      return "connecting…";
    case "connected":
      return "connected";
    case "disconnected":
      return "disconnected (reconnecting…)";
    case "error":
      return "error";
    default:
      return status;
  }
}
