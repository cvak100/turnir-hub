import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { personService } from "@/modules/admin/services/personService";
import type { PersonListItem } from "@/modules/admin/services/personService";
import { teamParticipationService } from "@/modules/teams/services/teamService";
import {
  participationPlayerService,
  type TeamParticipationPlayerListItem,
} from "@/modules/players/services/playerService";
import { eventLabelWithIcon } from "@/modules/live/eventIcons";
import { halfDisplayLabel } from "@/modules/live/matchStatuses";
import {
  eventTypeService,
  groupService,
  matchEventService,
  matchService,
  matchStatusService,
  phaseService,
  type EventTypeRef,
  type MatchDetail,
  type MatchEventDetail,
  type MatchEventListItem,
  type MatchStatusItem,
} from "../services/matchService";
import {
  isFinishedMatchStatus,
  isLiveMatchStatus,
} from "@/modules/live/matchStatuses";

type FormState = {
  status: string;
  match_number: string;
  match_date: string;
  tournament_phase_group: string;
  home_team_participation: string;
  away_team_participation: string;
  home_score: string;
  away_score: string;
  halftime_home_score: string;
  halftime_away_score: string;
  extra_time_home_score: string;
  extra_time_away_score: string;
  home_score_penalties: string;
  away_score_penalties: string;
  is_extra_time: boolean;
  is_penalties: boolean;
  is_walkover: boolean;
  duration_minutes: string;
  attendance: string;
  referee: string;
  notes: string;
};

type EventFormState = {
  event_type: string;
  minute: string;
  extra_minute: string;
  half: string;
  team_participation: string;
  player: string;
  related_player: string;
  goal_type: string;
  body_part: string;
  is_penalty: boolean;
  is_own_goal: boolean;
  is_var_decision: boolean;
  var_result: string;
  description: string;
  score_home_at_event: string;
  score_away_at_event: string;
  is_temporary_player: boolean;
  temporary_player_label: string;
};

function emptyForm(): FormState {
  return {
    status: "",
    match_number: "",
    match_date: "",
    tournament_phase_group: "",
    home_team_participation: "",
    away_team_participation: "",
    home_score: "",
    away_score: "",
    halftime_home_score: "",
    halftime_away_score: "",
    extra_time_home_score: "",
    extra_time_away_score: "",
    home_score_penalties: "",
    away_score_penalties: "",
    is_extra_time: false,
    is_penalties: false,
    is_walkover: false,
    duration_minutes: "",
    attendance: "",
    referee: "",
    notes: "",
  };
}

function emptyEventForm(): EventFormState {
  return {
    event_type: "",
    minute: "1",
    extra_minute: "",
    half: "1",
    team_participation: "",
    player: "",
    related_player: "",
    goal_type: "",
    body_part: "",
    is_penalty: false,
    is_own_goal: false,
    is_var_decision: false,
    var_result: "",
    description: "",
    score_home_at_event: "",
    score_away_at_event: "",
    is_temporary_player: false,
    temporary_player_label: "",
  };
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function numOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function personRoleLabels(person: PersonListItem): string {
  if (person.roles?.length) {
    return person.roles.map((r) => r.name || r.code).filter(Boolean).join(", ");
  }
  const flags: string[] = [];
  if (person.is_referee) flags.push("Sodnik");
  if (person.is_player) flags.push("Igralec");
  if (person.is_coach) flags.push("Trener");
  if (person.is_staff) flags.push("Staff");
  if (person.is_official) flags.push("Official");
  return flags.join(", ");
}

function personOptionLabel(person: PersonListItem): string {
  const name = [person.last_name, person.first_name].filter(Boolean).join(" ");
  const nickRaw = (person.nickname || "").trim();
  const nick = nickRaw ? ` (${nickRaw})` : "";
  const roles = personRoleLabels(person);
  return roles ? `${name}${nick} ? ${roles}` : `${name}${nick}`;
}

function detailToForm(match: MatchDetail): FormState {
  return {
    status: match.status?.id != null ? String(match.status.id) : "",
    match_number: match.match_number != null ? String(match.match_number) : "",
    match_date: toDatetimeLocal(match.match_date),
    tournament_phase_group:
      match.tournament_phase_group != null
        ? String(match.tournament_phase_group)
        : "",
    home_team_participation:
      match.home_team_participation != null
        ? String(match.home_team_participation)
        : "",
    away_team_participation:
      match.away_team_participation != null
        ? String(match.away_team_participation)
        : "",
    home_score: match.home_score != null ? String(match.home_score) : "",
    away_score: match.away_score != null ? String(match.away_score) : "",
    halftime_home_score:
      match.halftime_home_score != null ? String(match.halftime_home_score) : "",
    halftime_away_score:
      match.halftime_away_score != null ? String(match.halftime_away_score) : "",
    extra_time_home_score:
      match.extra_time_home_score != null
        ? String(match.extra_time_home_score)
        : "",
    extra_time_away_score:
      match.extra_time_away_score != null
        ? String(match.extra_time_away_score)
        : "",
    home_score_penalties:
      match.home_score_penalties != null
        ? String(match.home_score_penalties)
        : "",
    away_score_penalties:
      match.away_score_penalties != null
        ? String(match.away_score_penalties)
        : "",
    is_extra_time: match.is_extra_time,
    is_penalties: match.is_penalties,
    is_walkover: match.is_walkover,
    duration_minutes:
      match.duration_minutes != null ? String(match.duration_minutes) : "",
    attendance: match.attendance != null ? String(match.attendance) : "",
    referee: match.referee?.id != null ? String(match.referee.id) : "",
    notes: match.notes || "",
  };
}

function eventDetailToForm(e: MatchEventDetail): EventFormState {
  return {
    event_type: String(e.event_type.id),
    minute: String(e.minute),
    extra_minute: e.extra_minute != null ? String(e.extra_minute) : "",
    half: e.half || "1",
    team_participation: String(e.team_participation),
    player: e.player != null ? String(e.player) : "",
    related_player: e.related_player != null ? String(e.related_player) : "",
    goal_type: e.goal_type || "",
    body_part: e.body_part || "",
    is_penalty: e.is_penalty,
    is_own_goal: e.is_own_goal,
    is_var_decision: e.is_var_decision,
    var_result: e.var_result || "",
    description: e.description || "",
    score_home_at_event:
      e.score_home_at_event != null ? String(e.score_home_at_event) : "",
    score_away_at_event:
      e.score_away_at_event != null ? String(e.score_away_at_event) : "",
    is_temporary_player: e.is_temporary_player,
    temporary_player_label: e.temporary_player_label || "",
  };
}

function rosterPlayerLabel(row: TeamParticipationPlayerListItem): string {
  const p = row.player.person;
  const name = [p.last_name, p.first_name].filter(Boolean).join(" ");
  const num = row.jersey_number != null ? `#${row.jersey_number} ` : "";
  return `${num}${name || p.nickname || `Igralec #${row.player.id}`}`;
}

function eventActorLabel(e: MatchEventListItem): string {
  if (e.is_temporary_player) {
    return e.temporary_player_label || "Neznani";
  }
  return e.player_name ?? (e.player != null ? `#${e.player}` : "?");
}

function sortEvents(a: MatchEventListItem, b: MatchEventListItem): number {
  if (a.minute !== b.minute) return a.minute - b.minute;
  const ae = a.extra_minute ?? 0;
  const be = b.extra_minute ?? 0;
  if (ae !== be) return ae - be;
  return a.id - b.id;
}

export function MatchDetailPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const { hasPermission, isAdmin } = useAuth();
  const match = useAsyncData(() => matchService.get(matchId), [matchId]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const [events, setEvents] = useState<MatchEventListItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventTypeRef[]>([]);
  const [homeRoster, setHomeRoster] = useState<
    TeamParticipationPlayerListItem[]
  >([]);
  const [awayRoster, setAwayRoster] = useState<
    TeamParticipationPlayerListItem[]
  >([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(emptyEventForm());
  const [eventBusy, setEventBusy] = useState(false);

  const phase = useAsyncData(async () => {
    if (!match.data?.tournament_phase) return null;
    return phaseService.get(match.data.tournament_phase);
  }, [match.data?.tournament_phase]);

  const editionId = phase.data?.tournament_edition ?? null;

  const lookups = useAsyncData(async () => {
    if (editionId == null || !match.data?.tournament_phase) return null;
    const [statuses, parts, groups, persons] = await Promise.all([
      matchStatusService.list(),
      teamParticipationService.list({
        tournament_edition: editionId,
        page_size: 200,
      }),
      groupService.list({
        tournament_phase: match.data.tournament_phase,
        page_size: 100,
      }),
      personService.list({
        page_size: 200,
        ordering: "last_name",
        role: "referee",
      }),
    ]);
    return {
      statuses: Array.isArray(statuses)
        ? statuses
        : ((statuses as { results?: MatchStatusItem[] }).results ?? []),
      parts: parts.results,
      groups: groups.results,
      persons: persons.results.filter((p) => p.is_referee),
    };
  }, [editionId, match.data?.tournament_phase]);

  const loadEvents = useCallback(async () => {
    if (!Number.isFinite(matchId)) return;
    setEventsLoading(true);
    try {
      const page = await matchEventService.list({
        match: matchId,
        page_size: 500,
        ordering: "minute",
      });
      setEvents([...page.results].sort(sortEvents));
      const types = await eventTypeService.list();
      setEventTypes(Array.isArray(types) ? types : []);
    } catch (err) {
      setActionError(err);
    } finally {
      setEventsLoading(false);
    }
  }, [matchId]);

  const loadRosters = useCallback(async () => {
    if (!match.data) return;
    const homeId = match.data.home_team_participation;
    const awayId = match.data.away_team_participation;
    try {
      const [home, away] = await Promise.all([
        homeId
          ? participationPlayerService.list({
              team_participation: homeId,
              page_size: 100,
            })
          : Promise.resolve({ results: [] as TeamParticipationPlayerListItem[] }),
        awayId
          ? participationPlayerService.list({
              team_participation: awayId,
              page_size: 100,
            })
          : Promise.resolve({ results: [] as TeamParticipationPlayerListItem[] }),
      ]);
      setHomeRoster(home.results);
      setAwayRoster(away.results);
    } catch (err) {
      setActionError(err);
    }
  }, [match.data]);

  useEffect(() => {
    if (match.data) setForm(detailToForm(match.data));
  }, [match.data]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    void loadRosters();
  }, [loadRosters]);

  const canEdit =
    isAdmin ||
    hasPermission("match.result.edit", editionId) ||
    hasPermission("match.manage", editionId);
  const canStart = isAdmin || hasPermission("match.live.manage", editionId);
  const canEditEvent = isAdmin || hasPermission("match.event.edit", editionId);
  const canDeleteEvent =
    isAdmin || hasPermission("match.event.delete", editionId);

  const allRosterPlayers = useMemo(() => {
    const map = new Map<number, string>();
    for (const row of [...homeRoster, ...awayRoster]) {
      map.set(row.player.id, rosterPlayerLabel(row));
    }
    return map;
  }, [homeRoster, awayRoster]);

  const teamRoster = useMemo(() => {
    const tp = Number.parseInt(eventForm.team_participation, 10);
    if (!match.data || !Number.isFinite(tp)) return [];
    if (tp === match.data.home_team_participation) return homeRoster;
    if (tp === match.data.away_team_participation) return awayRoster;
    return [];
  }, [eventForm.team_participation, match.data, homeRoster, awayRoster]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setEventField<K extends keyof EventFormState>(
    key: K,
    value: EventFormState[K],
  ) {
    setEventForm((prev) => ({ ...prev, [key]: value }));
  }

  async function startMatch() {
    setBusy(true);
    setActionError(null);
    try {
      await matchService.start(matchId);
      match.reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEdit || !match.data) return;
    setBusy(true);
    setActionError(null);
    try {
      const updated = await matchService.update(matchId, {
        status: numOrNull(form.status) ?? undefined,
        match_number: numOrNull(form.match_number),
        match_date: fromDatetimeLocal(form.match_date),
        tournament_phase_group: numOrNull(form.tournament_phase_group),
        home_team_participation: numOrNull(form.home_team_participation),
        away_team_participation: numOrNull(form.away_team_participation),
        home_score: numOrNull(form.home_score),
        away_score: numOrNull(form.away_score),
        halftime_home_score: numOrNull(form.halftime_home_score),
        halftime_away_score: numOrNull(form.halftime_away_score),
        extra_time_home_score: numOrNull(form.extra_time_home_score),
        extra_time_away_score: numOrNull(form.extra_time_away_score),
        home_score_penalties: numOrNull(form.home_score_penalties),
        away_score_penalties: numOrNull(form.away_score_penalties),
        is_extra_time: form.is_extra_time,
        is_penalties: form.is_penalties,
        is_walkover: form.is_walkover,
        duration_minutes: numOrNull(form.duration_minutes),
        attendance: numOrNull(form.attendance),
        referee: numOrNull(form.referee),
        notes: form.notes,
      });
      setForm(detailToForm(updated));
      match.reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  async function openEditEvent(eventId: number) {
    if (!canEditEvent) return;
    setEventBusy(true);
    setActionError(null);
    try {
      const detail = await matchEventService.get(eventId);
      setEditingId(eventId);
      setEventForm(eventDetailToForm(detail));
    } catch (err) {
      setActionError(err);
    } finally {
      setEventBusy(false);
    }
  }

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !canEditEvent || !match.data) return;
    const eventTypeId = numOrNull(eventForm.event_type);
    const teamId = numOrNull(eventForm.team_participation);
    const minute = numOrNull(eventForm.minute);
    if (eventTypeId == null || teamId == null || minute == null) {
      setActionError(new Error("Tip, ekipa in minuta so obvezni."));
      return;
    }
    setEventBusy(true);
    setActionError(null);
    try {
      await matchEventService.update(editingId, {
        match: matchId,
        event_type: eventTypeId,
        team_participation: teamId,
        minute: Math.max(1, minute),
        extra_minute: numOrNull(eventForm.extra_minute),
        half: eventForm.half,
        player: eventForm.is_temporary_player
          ? null
          : numOrNull(eventForm.player),
        related_player: numOrNull(eventForm.related_player),
        goal_type: eventForm.goal_type,
        body_part: eventForm.body_part,
        is_penalty: eventForm.is_penalty,
        is_own_goal: eventForm.is_own_goal,
        is_var_decision: eventForm.is_var_decision,
        var_result: eventForm.var_result,
        description: eventForm.description,
        score_home_at_event: numOrNull(eventForm.score_home_at_event),
        score_away_at_event: numOrNull(eventForm.score_away_at_event),
        is_temporary_player: eventForm.is_temporary_player,
        temporary_player_label: eventForm.is_temporary_player
          ? eventForm.temporary_player_label
          : "",
      });
      setEditingId(null);
      setEventForm(emptyEventForm());
      await loadEvents();
    } catch (err) {
      setActionError(err);
    } finally {
      setEventBusy(false);
    }
  }

  async function deleteEvent(eventId: number) {
    if (!canDeleteEvent) return;
    if (!window.confirm("Izbri?em ta dogodek?")) return;
    setEventBusy(true);
    setActionError(null);
    try {
      await matchEventService.delete(eventId);
      if (editingId === eventId) {
        setEditingId(null);
        setEventForm(emptyEventForm());
      }
      await loadEvents();
    } catch (err) {
      setActionError(err);
    } finally {
      setEventBusy(false);
    }
  }

  if (!Number.isFinite(matchId)) {
    return <StateMessage variant="error" message="Neveljaven ID tekme." />;
  }

  const homeName = match.data?.home_team_name ?? "Doma?i";
  const awayName = match.data?.away_team_name ?? "Gostje";
  const statuses = lookups.data?.statuses ?? [];
  const parts = lookups.data?.parts ?? [];
  const groups = lookups.data?.groups ?? [];
  const persons = lookups.data?.persons ?? [];
  const refereeOptions = (() => {
    const list = [...persons];
    const currentId = match.data?.referee?.id;
    if (
      currentId != null &&
      !list.some((p) => p.id === currentId) &&
      match.data?.referee
    ) {
      const r = match.data.referee;
      list.unshift({
        id: r.id,
        first_name: r.first_name,
        last_name: r.last_name,
        nickname: r.nickname || "",
        email: "",
        status: null,
        user: null,
        show_as_anonymous: false,
        roles: [{ id: 0, name: "Sodnik", code: "referee" }],
        is_player: false,
        is_coach: false,
        is_referee: true,
        is_staff: false,
        is_official: false,
      });
    }
    return list;
  })();

  return (
    <div className="page">
      <PageHeader
        title={match.data ? `${homeName} vs ${awayName}` : "Tekma"}
        subtitle="Uredi tekmo"
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/live/matches/${matchId}`}
          >
            Open live
          </Link>
        }
      />
      <ErrorBanner
        error={actionError ?? match.error ?? phase.error ?? lookups.error}
      />
      {match.loading ? <StateMessage variant="loading" /> : null}

      {match.data ? (
        <>
          <section className="border-frame border-frame--md">
            <form className="stack-form" onSubmit={onSubmit}>
              <fieldset
                disabled={!canEdit || busy}
                style={{ border: 0, margin: 0, padding: 0 }}
              >
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="">?</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  ?tevilka tekme
                  <input
                    type="number"
                    min={1}
                    value={form.match_number}
                    onChange={(e) => setField("match_number", e.target.value)}
                  />
                </label>

                <label>
                  Datum / ura
                  <input
                    type="datetime-local"
                    value={form.match_date}
                    onChange={(e) => setField("match_date", e.target.value)}
                  />
                </label>

                <label>
                  Skupina
                  <select
                    value={form.tournament_phase_group}
                    onChange={(e) =>
                      setField("tournament_phase_group", e.target.value)
                    }
                  >
                    <option value="">?</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Doma?a ekipa
                  <select
                    value={form.home_team_participation}
                    onChange={(e) =>
                      setField("home_team_participation", e.target.value)
                    }
                  >
                    <option value="">?</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.participation_name || p.team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Gostujo?a ekipa
                  <select
                    value={form.away_team_participation}
                    onChange={(e) =>
                      setField("away_team_participation", e.target.value)
                    }
                  >
                    <option value="">?</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.participation_name || p.team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Kon?ni rezultat (doma?i)
                  <input
                    type="number"
                    min={0}
                    value={form.home_score}
                    onChange={(e) => setField("home_score", e.target.value)}
                  />
                </label>
                <label>
                  Kon?ni rezultat (gostje)
                  <input
                    type="number"
                    min={0}
                    value={form.away_score}
                    onChange={(e) => setField("away_score", e.target.value)}
                  />
                </label>

                <label>
                  Ob pol?asu (doma?i)
                  <input
                    type="number"
                    min={0}
                    value={form.halftime_home_score}
                    onChange={(e) =>
                      setField("halftime_home_score", e.target.value)
                    }
                  />
                </label>
                <label>
                  Ob pol?asu (gostje)
                  <input
                    type="number"
                    min={0}
                    value={form.halftime_away_score}
                    onChange={(e) =>
                      setField("halftime_away_score", e.target.value)
                    }
                  />
                </label>

                <label>
                  Goli v podalj?kih (doma?i)
                  <input
                    type="number"
                    min={0}
                    value={form.extra_time_home_score}
                    onChange={(e) =>
                      setField("extra_time_home_score", e.target.value)
                    }
                  />
                </label>
                <label>
                  Goli v podalj?kih (gostje)
                  <input
                    type="number"
                    min={0}
                    value={form.extra_time_away_score}
                    onChange={(e) =>
                      setField("extra_time_away_score", e.target.value)
                    }
                  />
                </label>

                <label>
                  Penali doma?i
                  <input
                    type="number"
                    min={0}
                    value={form.home_score_penalties}
                    onChange={(e) =>
                      setField("home_score_penalties", e.target.value)
                    }
                  />
                </label>
                <label>
                  Penali gostje
                  <input
                    type="number"
                    min={0}
                    value={form.away_score_penalties}
                    onChange={(e) =>
                      setField("away_score_penalties", e.target.value)
                    }
                  />
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    className="border-frame border-frame--sm"
                    checked={form.is_extra_time}
                    onChange={(e) => setField("is_extra_time", e.target.checked)}
                  />
                  Podalj?ki
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    className="border-frame border-frame--sm"
                    checked={form.is_penalties}
                    onChange={(e) => setField("is_penalties", e.target.checked)}
                  />
                  Penali
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    className="border-frame border-frame--sm"
                    checked={form.is_walkover}
                    onChange={(e) => setField("is_walkover", e.target.checked)}
                  />
                  Walkover (tehni?na zmaga)
                </label>

                <label>
                  Trajanje (min)
                  <input
                    type="number"
                    min={1}
                    value={form.duration_minutes}
                    onChange={(e) =>
                      setField("duration_minutes", e.target.value)
                    }
                  />
                </label>

                <label>
                  Obisk
                  <input
                    type="number"
                    min={0}
                    value={form.attendance}
                    onChange={(e) => setField("attendance", e.target.value)}
                  />
                </label>

                <label>
                  Sodnik
                  <select
                    value={form.referee}
                    onChange={(e) => setField("referee", e.target.value)}
                  >
                    <option value="">?</option>
                    {refereeOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {personOptionLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Opombe
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    rows={3}
                  />
                </label>

                <p className="muted">
                  Faza: {phase.data?.name ?? `#${match.data.tournament_phase}`}
                  {editionId != null ? (
                    <>
                      {" | "}
                      <Link to={`/editions/${editionId}`}>
                        Edicija #{editionId}
                      </Link>
                    </>
                  ) : null}
                </p>
              </fieldset>

              <div className="row-actions">
                {canEdit ? (
                  <button
                    type="submit"
                    className="border-frame border-frame--sm"
                    disabled={busy}
                  >
                    {busy ? "Shranjujem..." : "Shrani"}
                  </button>
                ) : (
                  <p className="muted">Nima? dovoljenja za urejanje tekme.</p>
                )}
                {canStart &&
                !isLiveMatchStatus(match.data.status?.code) &&
                !isFinishedMatchStatus(match.data.status?.code) ? (
                  <button
                    type="button"
                    className="button-secondary border-frame border-frame--sm"
                    onClick={() => void startMatch()}
                    disabled={busy}
                  >
                    Za?ni tekmo
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="border-frame border-frame--md">
            <h2>Dogodki</h2>
            {eventsLoading ? <StateMessage variant="loading" /> : null}
            {!eventsLoading && events.length === 0 ? (
              <p className="muted">Ni dogodkov.</p>
            ) : null}
            {!eventsLoading && events.length > 0 ? (
              <ul className="plain-list">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <strong>
                      {ev.minute}
                      {ev.extra_minute != null ? `+${ev.extra_minute}` : ""}'
                    </strong>{" "}
                    | {halfDisplayLabel(ev.half)} |{" "}
                    {ev.team_participation === match.data!.home_team_participation
                      ? homeName
                      : awayName}{" "}
                    |{" "}
                    {eventLabelWithIcon(ev.event_type.code, ev.event_type.name)}{" "}
                    | {eventActorLabel(ev)}
                    {ev.is_own_goal ? " (AG)" : ""}
                    {canEditEvent ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="linkish"
                          disabled={eventBusy}
                          onClick={() => void openEditEvent(ev.id)}
                        >
                          Uredi
                        </button>
                      </>
                    ) : null}
                    {canDeleteEvent ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="linkish"
                          disabled={eventBusy}
                          onClick={() => void deleteEvent(ev.id)}
                        >
                          Izbri?i
                        </button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {editingId != null ? (
              <form className="stack-form" onSubmit={saveEvent}>
                <h3>Uredi dogodek #{editingId}</h3>
                <fieldset
                  disabled={eventBusy}
                  style={{ border: 0, margin: 0, padding: 0 }}
                >
                  <label>
                    Tip
                    <select
                      value={eventForm.event_type}
                      onChange={(e) => setEventField("event_type", e.target.value)}
                      required
                    >
                      <option value="">?</option>
                      {eventTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {eventLabelWithIcon(t.code, t.name)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Minuta
                    <input
                      type="number"
                      min={1}
                      value={eventForm.minute}
                      onChange={(e) => setEventField("minute", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Dodatek
                    <input
                      type="number"
                      min={0}
                      value={eventForm.extra_minute}
                      onChange={(e) =>
                        setEventField("extra_minute", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Pol?as
                    <select
                      value={eventForm.half}
                      onChange={(e) => setEventField("half", e.target.value)}
                    >
                      <option value="1">1. pol?as</option>
                      <option value="2">2. pol?as</option>
                      <option value="ET1">Podalj?ki</option>
                      <option value="ET2">Podalj?ki 2</option>
                      <option value="penalties">Penali</option>
                    </select>
                  </label>

                  <label>
                    Ekipa
                    <select
                      value={eventForm.team_participation}
                      onChange={(e) => {
                        setEventField("team_participation", e.target.value);
                        setEventField("player", "");
                      }}
                      required
                    >
                      <option value="">?</option>
                      {match.data.home_team_participation != null ? (
                        <option value={match.data.home_team_participation}>
                          {homeName}
                        </option>
                      ) : null}
                      {match.data.away_team_participation != null ? (
                        <option value={match.data.away_team_participation}>
                          {awayName}
                        </option>
                      ) : null}
                    </select>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      className="border-frame border-frame--sm"
                      checked={eventForm.is_temporary_player}
                      onChange={(e) => {
                        setEventField("is_temporary_player", e.target.checked);
                        if (e.target.checked) setEventField("player", "");
                      }}
                    />
                    Neznani igralec
                  </label>

                  {eventForm.is_temporary_player ? (
                    <label>
                      Oznaka neznanega
                      <input
                        value={eventForm.temporary_player_label}
                        onChange={(e) =>
                          setEventField(
                            "temporary_player_label",
                            e.target.value,
                          )
                        }
                      />
                    </label>
                  ) : (
                    <label>
                      Igralec
                      <select
                        value={eventForm.player}
                        onChange={(e) =>
                          setEventField("player", e.target.value)
                        }
                      >
                        <option value="">?</option>
                        {teamRoster.map((row) => (
                          <option key={row.player.id} value={row.player.id}>
                            {rosterPlayerLabel(row)}
                          </option>
                        ))}
                        {eventForm.player &&
                        !teamRoster.some(
                          (r) => String(r.player.id) === eventForm.player,
                        ) ? (
                          <option value={eventForm.player}>
                            {allRosterPlayers.get(Number(eventForm.player)) ??
                              `#${eventForm.player}`}
                          </option>
                        ) : null}
                      </select>
                    </label>
                  )}

                  <label>
                    Povezan igralec (npr. asistent)
                    <select
                      value={eventForm.related_player}
                      onChange={(e) =>
                        setEventField("related_player", e.target.value)
                      }
                    >
                      <option value="">?</option>
                      {[...homeRoster, ...awayRoster].map((row) => (
                        <option key={row.player.id} value={row.player.id}>
                          {rosterPlayerLabel(row)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Tip gola
                    <input
                      value={eventForm.goal_type}
                      onChange={(e) =>
                        setEventField("goal_type", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Del telesa
                    <input
                      value={eventForm.body_part}
                      onChange={(e) =>
                        setEventField("body_part", e.target.value)
                      }
                    />
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      className="border-frame border-frame--sm"
                      checked={eventForm.is_penalty}
                      onChange={(e) =>
                        setEventField("is_penalty", e.target.checked)
                      }
                    />
                    11-metrovka
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      className="border-frame border-frame--sm"
                      checked={eventForm.is_own_goal}
                      onChange={(e) =>
                        setEventField("is_own_goal", e.target.checked)
                      }
                    />
                    Lastni gol
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      className="border-frame border-frame--sm"
                      checked={eventForm.is_var_decision}
                      onChange={(e) =>
                        setEventField("is_var_decision", e.target.checked)
                      }
                    />
                    VAR
                  </label>
                  <label>
                    VAR rezultat
                    <input
                      value={eventForm.var_result}
                      onChange={(e) =>
                        setEventField("var_result", e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Rezultat ob dogodku (doma?i)
                    <input
                      type="number"
                      min={0}
                      value={eventForm.score_home_at_event}
                      onChange={(e) =>
                        setEventField("score_home_at_event", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Rezultat ob dogodku (gostje)
                    <input
                      type="number"
                      min={0}
                      value={eventForm.score_away_at_event}
                      onChange={(e) =>
                        setEventField("score_away_at_event", e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Opis
                    <textarea
                      value={eventForm.description}
                      onChange={(e) =>
                        setEventField("description", e.target.value)
                      }
                      rows={2}
                    />
                  </label>
                </fieldset>

                <div className="row-actions">
                  <button
                    type="submit"
                    className="border-frame border-frame--sm"
                    disabled={eventBusy}
                  >
                    {eventBusy ? "Shranjujem..." : "Shrani dogodek"}
                  </button>
                  <button
                    type="button"
                    className="button-secondary border-frame border-frame--sm"
                    disabled={eventBusy}
                    onClick={() => {
                      setEditingId(null);
                      setEventForm(emptyEventForm());
                    }}
                  >
                    Prekli?i
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
