import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBanner, StateMessage } from "@/shared/components";
import { eventLabelWithIcon } from "@/modules/live/eventIcons";
import {
  participationPlayerService,
  type TeamParticipationPlayerListItem,
} from "@/modules/players/services/playerService";
import {
  eventTypeService,
  matchEventService,
  matchService,
  type EventTypeRef,
  type MatchDetail,
  type MatchEventDetail,
} from "../services/matchService";

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

function emptyForm(): EventFormState {
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

function numOrNull(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function detailToForm(e: MatchEventDetail): EventFormState {
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

function rosterLabel(row: TeamParticipationPlayerListItem): string {
  const p = row.player.person;
  const name = [p.last_name, p.first_name].filter(Boolean).join(" ");
  const num = row.jersey_number != null ? `#${row.jersey_number} ` : "";
  return `${num}${name || p.nickname || `Igralec #${row.player.id}`}`;
}

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

type Props = {
  eventId: number;
  onSaved: () => void;
  onCancel: () => void;
};

export function MatchEventEditForm({ eventId, onSaved, onCancel }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [form, setForm] = useState<EventFormState>(emptyForm());
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [eventTypes, setEventTypes] = useState<EventTypeRef[]>([]);
  const [homeRoster, setHomeRoster] = useState<
    TeamParticipationPlayerListItem[]
  >([]);
  const [awayRoster, setAwayRoster] = useState<
    TeamParticipationPlayerListItem[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await matchEventService.get(eventId);
      const [matchDetail, types] = await Promise.all([
        matchService.get(detail.match),
        eventTypeService.list(),
      ]);
      setForm(detailToForm(detail));
      setMatch(matchDetail);
      setEventTypes(normalizeList<EventTypeRef>(types));

      const homeId = matchDetail.home_team_participation;
      const awayId = matchDetail.away_team_participation;
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
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField<K extends keyof EventFormState>(
    key: K,
    value: EventFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const teamRoster = useMemo(() => {
    const tp = Number.parseInt(form.team_participation, 10);
    if (!match || !Number.isFinite(tp)) return [];
    if (tp === match.home_team_participation) return homeRoster;
    if (tp === match.away_team_participation) return awayRoster;
    return [];
  }, [form.team_participation, match, homeRoster, awayRoster]);

  const allRoster = useMemo(
    () => [...homeRoster, ...awayRoster],
    [homeRoster, awayRoster],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!match) return;
    const eventTypeId = numOrNull(form.event_type);
    const teamId = numOrNull(form.team_participation);
    const minute = numOrNull(form.minute);
    if (eventTypeId == null || teamId == null || minute == null) {
      setError(new Error("Tip, ekipa in minuta so obvezni."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await matchEventService.update(eventId, {
        match: match.id,
        event_type: eventTypeId,
        team_participation: teamId,
        minute: Math.max(1, minute),
        extra_minute: numOrNull(form.extra_minute),
        half: form.half,
        player: form.is_temporary_player ? null : numOrNull(form.player),
        related_player: numOrNull(form.related_player),
        goal_type: form.goal_type,
        body_part: form.body_part,
        is_penalty: form.is_penalty,
        is_own_goal: form.is_own_goal,
        is_var_decision: form.is_var_decision,
        var_result: form.var_result,
        description: form.description,
        score_home_at_event: numOrNull(form.score_home_at_event),
        score_away_at_event: numOrNull(form.score_away_at_event),
        is_temporary_player: form.is_temporary_player,
        temporary_player_label: form.is_temporary_player
          ? form.temporary_player_label
          : "",
      });
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <StateMessage variant="loading" />;

  const homeName = match?.home_team_name ?? "Domači";
  const awayName = match?.away_team_name ?? "Gostje";

  return (
    <section className="border-frame border-frame--md">
      <h3>
        Uredi dogodek #{eventId}
        {match ? (
          <span className="muted">
            {" "}
            · tekma #{match.id} · {homeName} vs {awayName}
          </span>
        ) : null}
      </h3>
      <ErrorBanner error={error} />
      <form className="stack-form" onSubmit={onSubmit}>
        <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0 }}>
          <label>
            Tip
            <select
              value={form.event_type}
              onChange={(e) => setField("event_type", e.target.value)}
              required
            >
              <option value="">—</option>
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
              value={form.minute}
              onChange={(e) => setField("minute", e.target.value)}
              required
            />
          </label>
          <label>
            Dodatek
            <input
              type="number"
              min={0}
              value={form.extra_minute}
              onChange={(e) => setField("extra_minute", e.target.value)}
            />
          </label>
          <label>
            Polčas
            <select
              value={form.half}
              onChange={(e) => setField("half", e.target.value)}
            >
              <option value="1">1. polčas</option>
              <option value="2">2. polčas</option>
              <option value="ET1">Podaljški</option>
              <option value="ET2">Podaljški 2</option>
              <option value="penalties">Penali</option>
            </select>
          </label>

          <label>
            Ekipa
            <select
              value={form.team_participation}
              onChange={(e) => {
                setField("team_participation", e.target.value);
                setField("player", "");
              }}
              required
            >
              <option value="">—</option>
              {match?.home_team_participation != null ? (
                <option value={match.home_team_participation}>{homeName}</option>
              ) : null}
              {match?.away_team_participation != null ? (
                <option value={match.away_team_participation}>{awayName}</option>
              ) : null}
            </select>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              className="border-frame border-frame--sm"
              checked={form.is_temporary_player}
              onChange={(e) => {
                setField("is_temporary_player", e.target.checked);
                if (e.target.checked) setField("player", "");
              }}
            />
            Neznani igralec
          </label>

          {form.is_temporary_player ? (
            <label>
              Oznaka neznanega
              <input
                value={form.temporary_player_label}
                onChange={(e) =>
                  setField("temporary_player_label", e.target.value)
                }
              />
            </label>
          ) : (
            <label>
              Igralec
              <select
                value={form.player}
                onChange={(e) => setField("player", e.target.value)}
              >
                <option value="">—</option>
                {teamRoster.map((row) => (
                  <option key={row.player.id} value={row.player.id}>
                    {rosterLabel(row)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Povezan igralec (npr. asistent)
            <select
              value={form.related_player}
              onChange={(e) => setField("related_player", e.target.value)}
            >
              <option value="">—</option>
              {allRoster.map((row) => (
                <option key={row.player.id} value={row.player.id}>
                  {rosterLabel(row)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tip gola
            <input
              value={form.goal_type}
              onChange={(e) => setField("goal_type", e.target.value)}
            />
          </label>
          <label>
            Del telesa
            <input
              value={form.body_part}
              onChange={(e) => setField("body_part", e.target.value)}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              className="border-frame border-frame--sm"
              checked={form.is_penalty}
              onChange={(e) => setField("is_penalty", e.target.checked)}
            />
            11-metrovka
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              className="border-frame border-frame--sm"
              checked={form.is_own_goal}
              onChange={(e) => setField("is_own_goal", e.target.checked)}
            />
            Lastni gol
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              className="border-frame border-frame--sm"
              checked={form.is_var_decision}
              onChange={(e) => setField("is_var_decision", e.target.checked)}
            />
            VAR
          </label>
          <label>
            VAR rezultat
            <input
              value={form.var_result}
              onChange={(e) => setField("var_result", e.target.value)}
            />
          </label>

          <label>
            Rezultat ob dogodku (domači)
            <input
              type="number"
              min={0}
              value={form.score_home_at_event}
              onChange={(e) => setField("score_home_at_event", e.target.value)}
            />
          </label>
          <label>
            Rezultat ob dogodku (gostje)
            <input
              type="number"
              min={0}
              value={form.score_away_at_event}
              onChange={(e) => setField("score_away_at_event", e.target.value)}
            />
          </label>

          <label>
            Opis
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
            />
          </label>
        </fieldset>

        <div className="row-actions">
          <button
            type="submit"
            className="border-frame border-frame--sm"
            disabled={busy}
          >
            {busy ? "Shranjujem..." : "Shrani dogodek"}
          </button>
          <button
            type="button"
            className="button-secondary border-frame border-frame--sm"
            disabled={busy}
            onClick={onCancel}
          >
            Nazaj na seznam
          </button>
        </div>
      </form>
    </section>
  );
}
