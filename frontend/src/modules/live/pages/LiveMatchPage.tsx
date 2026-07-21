import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  IntegerStepper,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import {
  eventTypeService,
  matchEventService,
  matchService,
  matchStatusService,
  phaseService,
  type EventTypeRef,
  type MatchDetail,
  type MatchEventListItem,
  type MatchStatusItem,
} from "@/modules/matches/services/matchService";
import {
  participationPlayerService,
  type TeamParticipationPlayerListItem,
} from "@/modules/players/services/playerService";
import { editionService } from "@/modules/editions/services/editionService";
import { eventLabelWithIcon } from "../eventIcons";
import {
  ConfirmEventModal,
  isPrimaryEventType,
  playerLabel,
  sortEventsForTimeline,
  useMatchClock,
  type SelectedActor,
} from "../components/LiveEventEditor";
import {
  eventHalfForStatus,
  halfDisplayLabel,
  isFinishedMatchStatus,
  isLiveMatchStatus,
  isScheduledMatchStatus,
  LIVE_QUICK_STATUS_CODES,
  matchMinuteFromPeriod,
  periodMaxMinutes,
} from "../matchStatuses";
import {
  useMatchWebSocket,
  type MatchUpdateMessage,
} from "../hooks/useMatchWebSocket";
import { ResolveTemporaryPlayerModal } from "../components/ResolveTemporaryPlayerModal";
import { upsertEventFromWs } from "../services/liveService";

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown }).results)
  ) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export function LiveMatchPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const { hasPermission, isAdmin } = useAuth();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<MatchEventListItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeRef[]>([]);
  const [matchStatuses, setMatchStatuses] = useState<MatchStatusItem[]>([]);
  const [homeRoster, setHomeRoster] = useState<TeamParticipationPlayerListItem[]>(
    [],
  );
  const [awayRoster, setAwayRoster] = useState<TeamParticipationPlayerListItem[]>(
    [],
  );
  const [editionId, setEditionId] = useState<number | null>(null);
  const [halfDurationMinutes, setHalfDurationMinutes] = useState<number | null>(
    null,
  );
  const [matchDurationMinutes, setMatchDurationMinutes] = useState<
    number | null
  >(null);
  const [numberOfHalves, setNumberOfHalves] = useState<number | null>(null);
  const [extraTimeMinutes, setExtraTimeMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const statusCode = match?.status?.code ?? "";
  const half = eventHalfForStatus(statusCode);
  const clockHalf = half === "penalties" ? "2" : half;
  const clockMaxMinutes = periodMaxMinutes({
    half: clockHalf,
    halfDurationMinutes,
    matchDurationMinutes: match?.duration_minutes ?? matchDurationMinutes,
    numberOfHalves,
    extraTimeMinutes,
  });
  const clock = useMatchClock(matchId, clockHalf, clockMaxMinutes);
  const [selected, setSelected] = useState<SelectedActor | null>(null);
  const [pendingType, setPendingType] = useState<EventTypeRef | null>(null);
  const [pendingMinute, setPendingMinute] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [shootoutStarters, setShootoutStarters] = useState("5");
  const [unknownSide, setUnknownSide] = useState<"home" | "away" | null>(null);
  const [unknownLabel, setUnknownLabel] = useState("");
  const [resolveEvent, setResolveEvent] = useState<MatchEventListItem | null>(
    null,
  );

  const loadAll = useCallback(async () => {
    const [matchData, eventsData, types, statuses] = await Promise.all([
      matchService.get(matchId),
      matchEventService.list({ match: matchId, page_size: 500 }),
      eventTypeService.list(),
      matchStatusService.list(),
    ]);
    const phase = await phaseService.get(matchData.tournament_phase);
    setMatch(matchData);
    setEvents(eventsData.results);
    setEventTypes(normalizeList<EventTypeRef>(types));
    setMatchStatuses(normalizeList<MatchStatusItem>(statuses));
    setEditionId(phase.tournament_edition);

    try {
      const edition = await editionService.get(phase.tournament_edition);
      const rule = edition.global_rule_template;
      setHalfDurationMinutes(
        edition.format_config?.half_duration_minutes ?? null,
      );
      setMatchDurationMinutes(rule?.match_duration_minutes ?? null);
      setNumberOfHalves(rule?.number_of_halves ?? 2);
      setExtraTimeMinutes(rule?.extra_time_minutes ?? null);
    } catch {
      setHalfDurationMinutes(null);
      setMatchDurationMinutes(null);
      setNumberOfHalves(2);
      setExtraTimeMinutes(null);
    }

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
    void loadAll().catch(setActionError);
  }, [loadAll]);

  useMatchWebSocket({
    matchId,
    enabled: Number.isFinite(matchId),
    onMessage: onWsMessage,
    onReconnect,
  });

  const canAdd = isAdmin || hasPermission("match.event.add", editionId);
  const canEdit = isAdmin || hasPermission("match.event.edit", editionId);
  const canDelete = isAdmin || hasPermission("match.event.delete", editionId);
  const canFinish = isAdmin || hasPermission("match.finish", editionId);
  const canLive = isAdmin || hasPermission("match.live.manage", editionId);

  const isLive = isLiveMatchStatus(statusCode);
  const isFinished = isFinishedMatchStatus(statusCode);
  const isScheduled = isScheduledMatchStatus(statusCode);
  const canEnterEvents = (isLive || isFinished) && (canAdd || canEdit);
  const inPenalties =
    statusCode === "match_penalties" || match?.is_penalties === true;
  const clockFrozen =
    statusCode === "match_halftime" || inPenalties || isFinished;

  const displayMatchMinute = matchMinuteFromPeriod({
    half: clockHalf,
    periodMinute: clock.suggestedMinute,
    halfDurationMinutes,
    matchDurationMinutes: match?.duration_minutes ?? matchDurationMinutes,
    numberOfHalves,
    extraTimeMinutes,
  });

  useEffect(() => {
    if (clockFrozen && clock.running) {
      clock.pause();
    }
  }, [clockFrozen, clock.running, clock.pause]);

  const quickStatuses = useMemo(() => {
    const byCode = new Map(matchStatuses.map((s) => [s.code, s]));
    return LIVE_QUICK_STATUS_CODES.map((code) => byCode.get(code)).filter(
      (s): s is MatchStatusItem => Boolean(s),
    );
  }, [matchStatuses]);

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
    () =>
      sortEventsForTimeline(events.filter((e) => e.half === "penalties")),
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

  function selectPlayer(
    side: "home" | "away",
    row: TeamParticipationPlayerListItem,
  ) {
    const participationId =
      side === "home"
        ? match?.home_team_participation
        : match?.away_team_participation;
    if (participationId == null) return;
    setSelected({
      teamParticipationId: participationId,
      side,
      playerId: row.player.id,
      isTemporary: false,
      label: "",
      displayName: `${row.jersey_number ?? "—"} ${playerLabel(row.player.person)}`,
    });
  }

  function confirmUnknown() {
    if (!unknownSide || !unknownLabel.trim() || !match) return;
    const participationId =
      unknownSide === "home"
        ? match.home_team_participation
        : match.away_team_participation;
    if (participationId == null) return;
    setSelected({
      teamParticipationId: participationId,
      side: unknownSide,
      playerId: null,
      isTemporary: true,
      label: unknownLabel.trim(),
      displayName: unknownLabel.trim(),
    });
    setUnknownSide(null);
    setUnknownLabel("");
  }

  function onActionClick(type: EventTypeRef) {
    if (!canEnterEvents || !canAdd) return;
    if (inPenalties) return;
    if (!selected) {
      setActionError("Najprej izberi igralca (ali neznanega igralca).");
      return;
    }
    setActionError(null);
    setPendingType(type);
    setPendingMinute(
      matchMinuteFromPeriod({
        half,
        periodMinute: clock.minuteFromTimer(),
        halfDurationMinutes,
        matchDurationMinutes: match?.duration_minutes ?? matchDurationMinutes,
        numberOfHalves,
        extraTimeMinutes,
      }),
    );
    setConfirmOpen(true);
  }

  function cancelPenalties() {
    return setMatchStatus("match_second_half");
  }

  async function startMatch() {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await matchService.start(matchId);
      setMatch(updated);
      clock.reset();
      clock.start();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function reopenMatch() {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await matchService.reopen(matchId);
      setMatch(updated);
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function setMatchStatus(code: string) {
    if (code === "match_finished") {
      const home = match?.home_team_name ?? "Domači";
      const away = match?.away_team_name ?? "Gostje";
      const score = `${match?.home_score ?? 0}:${match?.away_score ?? 0}`;
      const ok = window.confirm(
        `Res želiš KONČATI tekmo?\n\n${home} ${score} ${away}`,
      );
      if (!ok) return;
    }
    if (
      code === "match_halftime" ||
      code === "match_finished" ||
      code === "match_penalties"
    ) {
      clock.pause();
    }
    setBusy(true);
    setActionError(null);
    try {
      const updated = await matchService.setStatus(matchId, code);
      setMatch(updated);
      if (
        code === "match_finished" ||
        code === "match_halftime" ||
        code === "match_penalties"
      ) {
        clock.pause();
      }
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function recordShootoutKick(
    side: "home" | "away",
    scored: boolean,
  ) {
    if (!match || !canAdd) return;
    const participationId =
      side === "home"
        ? match.home_team_participation
        : match.away_team_participation;
    if (participationId == null) return;
    const type = eventTypes.find(
      (t) => t.code === (scored ? "penalty_scored" : "penalty_missed"),
    );
    if (!type) {
      setActionError("Manjka EventType za penali (seed_event_types).");
      return;
    }
    const nextMinute =
      shootoutEvents.reduce((max, e) => Math.max(max, e.minute), 0) + 1;
    setBusy(true);
    setActionError(null);
    try {
      await matchEventService.create({
        match: matchId,
        event_type: type.id,
        team_participation: participationId,
        minute: nextMinute,
        half: "penalties",
        player: null,
        is_temporary_player: false,
        temporary_player_label: "",
      });
      await loadAll();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent(eventId: number) {
    if (!canDelete) return;
    if (!window.confirm("Izbrišem ta dogodek?")) return;
    setBusy(true);
    setActionError(null);
    try {
      await matchEventService.delete(eventId);
      await loadAll();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }


  async function refreshFromEvents() {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await matchService.recalculate(matchId);
      setMatch(updated);
      await loadAll();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  const starters = Number.parseInt(shootoutStarters, 10) || 5;
  const nextKickIndex = shootoutEvents.length + 1;
  const nextKickSide: "home" | "away" =
    nextKickIndex % 2 === 1 ? "home" : "away";

  if (!Number.isFinite(matchId)) {
    return <StateMessage variant="error" message="Invalid match id." />;
  }

  return (
    <div className="page live-edit-page">
      <PageHeader
        title={isLive ? "Live Edit" : isFinished ? "Normal Edit" : "Tekma"}
        actions={
          <>
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy || loading}
              onClick={() => void refreshFromEvents()}
            >
              {busy ? "Osvežujem…" : "Refresh"}
            </button>
            <Link
              className="button-link border-frame border-frame--sm"
              to={`/matches/${matchId}`}
            >
              Detail
            </Link>
          </>
        }
      />

      <ErrorBanner error={actionError ?? error} />
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
                {match.status.name || match.status.code}
              </p>
            ) : null}
            {!inPenalties ? (
              <div className="live-clock-row">
                <strong className="live-clock">⏱ {clock.clockLabel}</strong>
                <span className="muted">~{displayMatchMinute}&apos;</span>
                {clock.maxMinutes != null ? (
                  <span className="muted">
                    (polčas / {clock.maxMinutes}&apos;)
                  </span>
                ) : null}
                {!clockFrozen ? (
                  <>
                    {!clock.atMax ? (
                      <button
                        type="button"
                        className="border-frame border-frame--sm"
                        onClick={() =>
                          clock.running ? clock.pause() : clock.start()
                        }
                      >
                        {clock.running ? "⏸ Pause" : "▶️ Start"}
                      </button>
                    ) : (
                      <span className="muted">Konec polčasa</span>
                    )}
                    <button
                      type="button"
                      className="button-secondary border-frame border-frame--sm"
                      onClick={clock.reset}
                    >
                      🔁 Reset
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="live-period-row">
              {quickStatuses.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className={
                    statusCode === s.code
                      ? "live-period-btn live-period-btn--active border-frame border-frame--sm"
                      : "live-period-btn border-frame border-frame--sm"
                  }
                  disabled={
                    busy ||
                    (s.code === "match_finished"
                      ? !canFinish && !canLive
                      : !canLive)
                  }
                  onClick={() => void setMatchStatus(s.code)}
                >
                  {s.name}
                </button>
              ))}
            </div>
            {quickStatuses.length === 0 ? (
              <p className="muted">
                Ni statusov — zaženi{" "}
                <code>python manage.py seed_statuses</code>
              </p>
            ) : null}
            <div className="row-actions">
              {canLive && isScheduled ? (
                <button
                  type="button"
                  className="live-action live-action--primary border-frame border-frame--sm"
                  onClick={() => void startMatch()}
                  disabled={busy}
                >
                  Začetek tekme
                </button>
              ) : null}
              {canLive && isFinished ? (
                <button
                  type="button"
                  className="live-action live-action--primary border-frame border-frame--sm"
                  onClick={() => void reopenMatch()}
                  disabled={busy}
                >
                  Nazaj v Live
                </button>
              ) : null}
            </div>
          </section>

          {inPenalties ? (
            <section className="border-frame border-frame--md live-shootout">
              <div className="row-actions" style={{ justifyContent: "space-between" }}>
                <h2 style={{ margin: 0 }}>Penalty shootout</h2>
                {canLive ? (
                  <button
                    type="button"
                    className="button-secondary border-frame border-frame--sm"
                    onClick={() => void cancelPenalties()}
                    disabled={busy}
                  >
                    Prekliči penale
                  </button>
                ) : null}
              </div>
              <p className="muted">
                Zaporedje = polje minute. Goli ne grejo v statistiko igralcev.
              </p>
              <label>
                Začetnih strelcev (na ekipo, informativno)
                <IntegerStepper
                  value={shootoutStarters}
                  min={3}
                  max={5}
                  emptyMeansNull={false}
                  onChange={setShootoutStarters}
                />
              </label>
              <ol className="plain-list">
                {shootoutEvents.map((e) => (
                  <li key={e.id}>
                    #{e.minute}{" "}
                    {e.team_participation === match.home_team_participation
                      ? "Domači"
                      : "Gostje"}{" "}
                    · {eventLabelWithIcon(e.event_type.code, e.event_type.name)}
                    {canDelete ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => void deleteEvent(e.id)}
                        >
                          Izbriši
                        </button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ol>
              {canAdd && (isLive || isFinished) ? (
                <div className="live-shootout-kick">
                  <p>
                    Zaporedje {nextKickIndex}:{" "}
                    <strong>
                      {nextKickSide === "home" ? "Domači" : "Gostje"}
                    </strong>
                    {nextKickIndex > starters * 2
                      ? " (sudden death)"
                      : null}
                  </p>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="live-action live-action--primary border-frame border-frame--sm"
                      disabled={busy}
                      onClick={() => void recordShootoutKick(nextKickSide, true)}
                    >
                      Zadet
                    </button>
                    <button
                      type="button"
                      className="live-action border-frame border-frame--sm"
                      disabled={busy}
                      onClick={() =>
                        void recordShootoutKick(nextKickSide, false)
                      }
                    >
                      Zgrešen
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="border-frame border-frame--md live-split">
            <h2>Timeline</h2>
            <div className="live-split__cols">
              <div>
                <h3>{match.home_team_name ?? "Domači"}</h3>
                <EventList
                  events={homeEvents}
                  labelFor={eventActorLabel}
                  canDelete={canDelete}
                  canResolveTemp={canEdit}
                  onDelete={deleteEvent}
                  onResolveTemp={setResolveEvent}
                />
              </div>
              <div>
                <h3>{match.away_team_name ?? "Gostje"}</h3>
                <EventList
                  events={awayEvents}
                  labelFor={eventActorLabel}
                  canDelete={canDelete}
                  canResolveTemp={canEdit}
                  onDelete={deleteEvent}
                  onResolveTemp={setResolveEvent}
                />
              </div>
            </div>
          </section>

          <section className="border-frame border-frame--md live-split">
            <h2>Igralci</h2>
            {selected ? (
              <p className="live-selected">
                Izbran: <strong>{selected.displayName}</strong> (
                {selected.side === "home" ? "domači" : "gostje"}){" "}
                <button
                  type="button"
                  className="linkish"
                  onClick={() => setSelected(null)}
                >
                  Počisti
                </button>
              </p>
            ) : (
              <p className="muted">Najprej izberi igralca, nato akcijo.</p>
            )}
            <div className="live-split__cols">
              <RosterColumn
                title={match.home_team_name ?? "Domači"}
                roster={homeRoster}
                selectedPlayerId={
                  selected?.side === "home" && !selected.isTemporary
                    ? selected.playerId
                    : null
                }
                disabled={!canEnterEvents}
                onSelect={(row) => selectPlayer("home", row)}
                onUnknown={() => {
                  setUnknownSide("home");
                  setUnknownLabel("Neznani #");
                }}
              />
              <RosterColumn
                title={match.away_team_name ?? "Gostje"}
                roster={awayRoster}
                selectedPlayerId={
                  selected?.side === "away" && !selected.isTemporary
                    ? selected.playerId
                    : null
                }
                disabled={!canEnterEvents}
                onSelect={(row) => selectPlayer("away", row)}
                onUnknown={() => {
                  setUnknownSide("away");
                  setUnknownLabel("Neznani #");
                }}
              />
            </div>
          </section>

          {!inPenalties ? (
            <section className="border-frame border-frame--md live-actions">
              <h2>Akcije</h2>
              {!canEnterEvents ? (
                <p className="muted">
                  {isScheduled
                    ? "Najprej pritisni Začetek tekme."
                    : !canAdd
                      ? "Nimaš dovoljenja match.event.add — prijavi se kot admin."
                      : "Dogodkov trenutno ni mogoče vnašati."}
                </p>
              ) : null}
              {canEnterEvents && eventTypes.length === 0 ? (
                <p className="muted">
                  Ni tipov dogodkov. V backendu zaženi:{" "}
                  <code>python manage.py seed_event_types</code>
                </p>
              ) : null}
              {canEnterEvents && eventTypes.length > 0 ? (
                <div className="live-actions__grid">
                  {eventTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className={
                        isPrimaryEventType(type.code)
                          ? "live-action live-action--primary border-frame border-frame--sm"
                          : "live-action border-frame border-frame--sm"
                      }
                      disabled={!canAdd || busy}
                      onClick={() => onActionClick(type)}
                    >
                      {eventLabelWithIcon(type.code, type.name)}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

        </>
      ) : null}

      {unknownSide ? (
        <div
          className="live-modal-backdrop"
          role="presentation"
          onClick={() => setUnknownSide(null)}
        >
          <div
            className="live-modal border-frame border-frame--md"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Neznani igralec</h3>
            <label className="stack-form">
              Oznaka
              <input
                value={unknownLabel}
                onChange={(e) => setUnknownLabel(e.target.value)}
                placeholder="Neznani #9"
                autoFocus
              />
            </label>
            <div className="row-actions">
              <button
                type="button"
                className="border-frame border-frame--sm"
                onClick={confirmUnknown}
              >
                Izberi
              </button>
              <button
                type="button"
                className="button-secondary border-frame border-frame--sm"
                onClick={() => setUnknownSide(null)}
              >
                Prekliči
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ResolveTemporaryPlayerModal
        open={resolveEvent != null}
        event={resolveEvent}
        editionId={editionId}
        onClose={() => setResolveEvent(null)}
        onLinked={() => {
          void loadAll().catch(setActionError);
        }}
      />

      <ConfirmEventModal
        open={confirmOpen}
        matchId={matchId}
        eventType={pendingType}
        actor={selected}
        suggestedMinute={pendingMinute}
        half={half}
        onClose={() => {
          setConfirmOpen(false);
          setPendingType(null);
        }}
        onSaved={() => {
          void loadAll().catch(setActionError);
        }}
      />
    </div>
  );
}

function EventList({
  events,
  labelFor,
  canDelete,
  canResolveTemp,
  onDelete,
  onResolveTemp,
}: {
  events: MatchEventListItem[];
  labelFor: (e: MatchEventListItem) => string;
  canDelete: boolean;
  canResolveTemp: boolean;
  onDelete: (id: number) => void;
  onResolveTemp: (event: MatchEventListItem) => void;
}) {
  if (events.length === 0) {
    return <p className="muted">Ni dogodkov.</p>;
  }

  const sections: { half: string; items: MatchEventListItem[] }[] = [];
  for (const e of events) {
    const h = e.half || "1";
    const last = sections[sections.length - 1];
    if (!last || last.half !== h) {
      sections.push({ half: h, items: [e] });
    } else {
      last.items.push(e);
    }
  }

  return (
    <ul className="live-timeline-list">
      {sections.map((section) => (
        <li key={`half-${section.half}`} className="live-timeline-section">
          <div className="live-timeline-half">
            {halfDisplayLabel(section.half)}
          </div>
          <ul className="live-timeline-half-events">
            {section.items.map((e) => (
              <li key={e.id}>
                <strong>
                  {e.minute}
                  {e.extra_minute != null ? `+${e.extra_minute}` : ""}&apos;
                </strong>{" "}
                {eventLabelWithIcon(e.event_type.code, e.event_type.name)}{" "}
                {e.is_temporary_player && canResolveTemp ? (
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => onResolveTemp(e)}
                  >
                    {labelFor(e)}
                  </button>
                ) : (
                  labelFor(e)
                )}
                {e.is_own_goal ? " (AG)" : ""}
                {canDelete ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => onDelete(e.id)}
                    >
                      ×
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function RosterColumn({
  title,
  roster,
  selectedPlayerId,
  disabled,
  onSelect,
  onUnknown,
}: {
  title: string;
  roster: TeamParticipationPlayerListItem[];
  selectedPlayerId: number | null;
  disabled: boolean;
  onSelect: (row: TeamParticipationPlayerListItem) => void;
  onUnknown: () => void;
}) {
  return (
    <div>
      <h3>{title}</h3>
      <ul className="live-roster-list">
        {roster.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className={
                selectedPlayerId === row.player.id
                  ? "live-roster-btn live-roster-btn--active border-frame border-frame--sm"
                  : "live-roster-btn border-frame border-frame--sm"
              }
              disabled={disabled}
              onClick={() => onSelect(row)}
            >
              <span className="live-roster-btn__num">
                {row.jersey_number ?? "—"}
              </span>
              {playerLabel(row.player.person)}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="linkish"
        disabled={disabled}
        onClick={onUnknown}
      >
        + Neznani igralec
      </button>
    </div>
  );
}
