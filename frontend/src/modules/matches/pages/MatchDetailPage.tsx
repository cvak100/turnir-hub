import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  IntegerStepper,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { useAuth } from "@/shared/auth";
import { personService } from "@/modules/admin/services/personService";
import { teamParticipationService } from "@/modules/teams/services/teamService";
import {
  groupService,
  matchService,
  matchStatusService,
  phaseService,
  type MatchDetail,
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

function detailToForm(match: MatchDetail): FormState {
  return {
    status: match.status?.id != null ? String(match.status.id) : "",
    match_number:
      match.match_number != null ? String(match.match_number) : "",
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
      match.halftime_home_score != null
        ? String(match.halftime_home_score)
        : "",
    halftime_away_score:
      match.halftime_away_score != null
        ? String(match.halftime_away_score)
        : "",
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

export function MatchDetailPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const { hasPermission, isAdmin } = useAuth();
  const match = useAsyncData(() => matchService.get(matchId), [matchId]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

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
      personService.list({ page_size: 200, ordering: "last_name" }),
    ]);
    return {
      statuses: Array.isArray(statuses)
        ? statuses
        : ((statuses as { results?: MatchStatusItem[] }).results ?? []),
      parts: parts.results,
      groups: groups.results,
      persons: persons.results,
    };
  }, [editionId, match.data?.tournament_phase]);

  useEffect(() => {
    if (match.data) setForm(detailToForm(match.data));
  }, [match.data]);

  const canEdit =
    isAdmin ||
    hasPermission("match.result.edit", editionId) ||
    hasPermission("match.manage", editionId);
  const canStart = isAdmin || hasPermission("match.live.manage", editionId);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedOk(false);
  }

  async function startMatch() {
    setBusy(true);
    setActionError(null);
    setSavedOk(false);
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
    setSavedOk(false);
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
      setSavedOk(true);
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!Number.isFinite(matchId)) {
    return <StateMessage variant="error" message="Invalid match id." />;
  }

  const homeName = match.data?.home_team_name ?? "Domaci";
  const awayName = match.data?.away_team_name ?? "Gostje";

  return (
    <div className="page">
      <PageHeader
        title={match.data ? `${homeName} vs ${awayName}` : "Match"}
        subtitle={
          match.data?.status
            ? match.data.status.name || match.data.status.code
            : "Match detail"
        }
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
        <form className="stack-form match-detail-form" onSubmit={onSubmit}>
          <fieldset
            className="match-detail-fieldset"
            disabled={!canEdit || busy}
          >
          <section className="border-frame border-frame--md">
            <h2>Rezultat</h2>
            <p className="scoreline match-detail-scoreline">
              {form.home_score || "—"}
              <span className="scoreline__sep">:</span>
              {form.away_score || "—"}
            </p>
            <div className="group-stage-rules__grid">
              <label>
                {homeName}
                <IntegerStepper
                  value={form.home_score}
                  min={0}
                  max={99}
                  emptyMeansNull
                  onChange={(v) => setField("home_score", v)}
                  aria-label="Domaci rezultat"
                />
              </label>
              <label>
                {awayName}
                <IntegerStepper
                  value={form.away_score}
                  min={0}
                  max={99}
                  emptyMeansNull
                  onChange={(v) => setField("away_score", v)}
                  aria-label="Gostujoci rezultat"
                />
              </label>
            </div>
          </section>

          <section className="border-frame border-frame--md">
            <h2>Polcas / podaljški / penali</h2>
            <div className="group-stage-rules__grid">
              <label>
                Polcas {homeName}
                <IntegerStepper
                  value={form.halftime_home_score}
                  min={0}
                  max={99}
                  emptyMeansNull
                  onChange={(v) => setField("halftime_home_score", v)}
                />
              </label>
              <label>
                Polcas {awayName}
                <IntegerStepper
                  value={form.halftime_away_score}
                  min={0}
                  max={99}
                  emptyMeansNull
                  onChange={(v) => setField("halftime_away_score", v)}
                />
              </label>
              <label>
                ET {homeName}
                <IntegerStepper
                  value={form.extra_time_home_score}
                  min={0}
                  max={99}
                  emptyMeansNull
                  onChange={(v) => setField("extra_time_home_score", v)}
                />
              </label>
              <label>
                ET {awayName}
                <IntegerStepper
                  value={form.extra_time_away_score}
                  min={0}
                  max={99}
                  emptyMeansNull
                  onChange={(v) => setField("extra_time_away_score", v)}
                />
              </label>
              <label>
                Pen. {homeName}
                <IntegerStepper
                  value={form.home_score_penalties}
                  min={0}
                  max={50}
                  emptyMeansNull
                  onChange={(v) => setField("home_score_penalties", v)}
                />
              </label>
              <label>
                Pen. {awayName}
                <IntegerStepper
                  value={form.away_score_penalties}
                  min={0}
                  max={50}
                  emptyMeansNull
                  onChange={(v) => setField("away_score_penalties", v)}
                />
              </label>
            </div>
            <div className="match-detail-flags">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  className="border-frame border-frame--sm"
                  checked={form.is_extra_time}
                  onChange={(e) => setField("is_extra_time", e.target.checked)}
                />
                Podaljški
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
                Walkover
              </label>
            </div>
          </section>

          <section className="border-frame border-frame--md">
            <h2>Tekma</h2>
            <div className="group-stage-rules__grid">
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                >
                  <option value="">—</option>
                  {(lookups.data?.statuses ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Št. tekme
                <IntegerStepper
                  value={form.match_number}
                  min={1}
                  max={9999}
                  emptyMeansNull
                  onChange={(v) => setField("match_number", v)}
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
                Trajanje (min)
                <IntegerStepper
                  value={form.duration_minutes}
                  min={1}
                  max={300}
                  emptyMeansNull
                  onChange={(v) => setField("duration_minutes", v)}
                />
              </label>
              <label>
                Obisk
                <IntegerStepper
                  value={form.attendance}
                  min={0}
                  max={200000}
                  emptyMeansNull
                  onChange={(v) => setField("attendance", v)}
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
                  <option value="">—</option>
                  {(lookups.data?.groups ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="muted match-detail-meta">
              Faza: {phase.data?.name ?? `#${match.data.tournament_phase}`}
              {editionId != null ? (
                <>
                  {" · "}
                  Edition:{" "}
                  <Link to={`/editions/${editionId}`}>#{editionId}</Link>
                </>
              ) : null}
            </p>
          </section>

          <section className="border-frame border-frame--md">
            <h2>Ekipe</h2>
            <div className="group-stage-rules__grid">
              <label>
                Domaci
                <select
                  value={form.home_team_participation}
                  onChange={(e) =>
                    setField("home_team_participation", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {(lookups.data?.parts ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.participation_name || p.team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Gostje
                <select
                  value={form.away_team_participation}
                  onChange={(e) =>
                    setField("away_team_participation", e.target.value)
                  }
                >
                  <option value="">—</option>
                  {(lookups.data?.parts ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.participation_name || p.team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="border-frame border-frame--md">
            <h2>Sodnik & opombe</h2>
            <div className="group-stage-rules__grid">
              <label>
                Sodnik
                <select
                  value={form.referee}
                  onChange={(e) => setField("referee", e.target.value)}
                >
                  <option value="">—</option>
                  {(lookups.data?.persons ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.last_name, p.first_name].filter(Boolean).join(" ") ||
                        `#${p.id}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Opombe
              <textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={3}
              />
            </label>
          </section>
          </fieldset>

          <div className="row-actions">
            {canEdit ? (
              <button
                type="submit"
                className="border-frame border-frame--sm"
                disabled={busy}
              >
                {busy ? "Shranjujem…" : "Shrani"}
              </button>
            ) : (
              <p className="muted">Nimaš dovoljenja za urejanje tekme.</p>
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
                {busy ? "…" : "Start match"}
              </button>
            ) : null}
            {savedOk ? <span className="muted">Shranjeno.</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
