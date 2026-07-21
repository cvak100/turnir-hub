import { useEffect, useMemo, useState } from "react";
import { ErrorBanner, IntegerStepper } from "@/shared/components";
import {
  matchEventService,
  type EventTypeRef,
  type MatchEventInput,
} from "@/modules/matches/services/matchService";
import { eventLabelWithIcon } from "../eventIcons";
import { halfDisplayLabel, halfSortKey } from "../matchStatuses";

export type SelectedActor = {
  teamParticipationId: number;
  side: "home" | "away";
  playerId: number | null;
  isTemporary: boolean;
  label: string;
  displayName: string;
};

type Props = {
  open: boolean;
  matchId: number;
  eventType: EventTypeRef | null;
  actor: SelectedActor | null;
  suggestedMinute: number;
  half: string;
  onClose: () => void;
  onSaved: () => void;
};

export function ConfirmEventModal({
  open,
  matchId,
  eventType,
  actor,
  suggestedMinute,
  half,
  onClose,
  onSaved,
}: Props) {
  const [minute, setMinute] = useState(String(suggestedMinute));
  const [extraMinute, setExtraMinute] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    setMinute(String(Math.max(1, suggestedMinute || 1)));
    setExtraMinute("");
    setError(null);
  }, [open, suggestedMinute, eventType?.id, actor?.displayName]);

  if (!open || !eventType || !actor) return null;

  const halfLabel = halfDisplayLabel(half);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload: MatchEventInput = {
        match: matchId,
        event_type: eventType!.id,
        team_participation: actor!.teamParticipationId,
        minute: Math.max(1, Number.parseInt(minute, 10) || 1),
        extra_minute:
          extraMinute.trim() === "" ? null : Number.parseInt(extraMinute, 10),
        half,
        player: actor!.isTemporary ? null : actor!.playerId,
        is_temporary_player: actor!.isTemporary,
        temporary_player_label: actor!.isTemporary ? actor!.label : "",
        is_own_goal: eventType!.code === "own_goal",
      };
      await matchEventService.create(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="live-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="live-modal border-frame border-frame--md"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Potrdi dogodek</h3>
        <p>
          <strong>
            {eventLabelWithIcon(eventType.code, eventType.name)}
          </strong>
          {" · "}
          {actor.displayName}
          {" · "}
          {actor.side === "home" ? "Domači" : "Gostje"}
          {" · "}
          <span className="muted">{halfLabel}</span>
        </p>
        <ErrorBanner error={error} />
        <div className="stack-form">
          <label>
            Minuta ({halfLabel})
            <IntegerStepper
              value={minute}
              min={1}
              max={half === "penalties" ? 50 : 130}
              emptyMeansNull={false}
              onChange={setMinute}
            />
          </label>
          {half !== "penalties" ? (
            <label>
              Dodatek (extra)
              <IntegerStepper
                value={extraMinute}
                min={0}
                max={30}
                emptyMeansNull
                onChange={setExtraMinute}
              />
            </label>
          ) : null}
          <div className="row-actions">
            <button
              type="button"
              className="border-frame border-frame--sm"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Shranjujem…" : "Potrdi"}
            </button>
            <button
              type="button"
              className="button-secondary border-frame border-frame--sm"
              disabled={busy}
              onClick={onClose}
            >
              Prekliči
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PRIMARY_CODES = new Set([
  "goal",
  "yellow_card",
  "red_card",
  "substitution_in",
  "substitution_out",
  "penalty_scored",
  "own_goal",
  "assist",
]);

export function isPrimaryEventType(code: string): boolean {
  return PRIMARY_CODES.has(code);
}

export function sortEventsForTimeline<
  T extends {
    minute: number;
    extra_minute: number | null;
    id: number;
    half?: string;
  },
>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ha = halfSortKey(a.half);
    const hb = halfSortKey(b.half);
    if (ha !== hb) return ha - hb;
    if (a.minute !== b.minute) return a.minute - b.minute;
    const ae = a.extra_minute ?? 0;
    const be = b.extra_minute ?? 0;
    if (ae !== be) return ae - be;
    return a.id - b.id;
  });
}

export function playerLabel(person: {
  first_name?: string;
  last_name?: string;
  nickname?: string;
}): string {
  const name = [person.last_name, person.first_name].filter(Boolean).join(" ");
  if (name) return name;
  return person.nickname || "Igralec";
}

type ClockPersisted = {
  baseElapsed: number;
  running: boolean;
  startedAt: number | null;
};

function clockKey(matchId: number, half: string) {
  return `turnirhub.live-clock.${matchId}.${half}`;
}

function readClock(matchId: number, half: string): ClockPersisted | null {
  try {
    const raw = localStorage.getItem(clockKey(matchId, half));
    if (!raw) return null;
    return JSON.parse(raw) as ClockPersisted;
  } catch {
    return null;
  }
}

function writeClock(matchId: number, half: string, state: ClockPersisted) {
  try {
    localStorage.setItem(clockKey(matchId, half), JSON.stringify(state));
  } catch {
    // ignore
  }
}

function elapsedNow(state: ClockPersisted): number {
  if (state.running && state.startedAt != null) {
    return Math.max(
      0,
      state.baseElapsed + Math.floor((Date.now() - state.startedAt) / 1000),
    );
  }
  return Math.max(0, state.baseElapsed);
}

/** 0:00–0:59 → 1′, 1:00–1:59 → 2′, … capped at maxMinutes. */
function periodMinuteFromElapsed(
  elapsedSec: number,
  maxMinutes: number | null,
): number {
  let minute = Math.floor(Math.max(0, elapsedSec) / 60) + 1;
  if (maxMinutes != null && maxMinutes > 0) {
    minute = Math.min(minute, maxMinutes);
  }
  return Math.max(1, minute);
}

/** Informative match clock — survives refresh via localStorage.
 *  Caps at maxMinutes (rules) and auto-pauses when reached. */
export function useMatchClock(
  matchId: number,
  half: string,
  maxMinutes: number | null = null,
) {
  const [tick, setTick] = useState(0);
  const [version, setVersion] = useState(0);

  const maxSeconds =
    maxMinutes != null && maxMinutes > 0 ? Math.floor(maxMinutes * 60) : null;

  const state = useMemo((): ClockPersisted => {
    if (!Number.isFinite(matchId)) {
      return { baseElapsed: 0, running: false, startedAt: null };
    }
    return (
      readClock(matchId, half) ?? {
        baseElapsed: 0,
        running: false,
        startedAt: null,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, half, version, tick]);

  const rawElapsed = elapsedNow(state);
  const elapsedSec =
    maxSeconds != null ? Math.min(rawElapsed, maxSeconds) : rawElapsed;
  const atMax = maxSeconds != null && elapsedSec >= maxSeconds;

  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.running, matchId, half]);

  useEffect(() => {
    if (!state.running || maxSeconds == null) return;
    if (rawElapsed < maxSeconds) return;
    writeClock(matchId, half, {
      baseElapsed: maxSeconds,
      running: false,
      startedAt: null,
    });
    setVersion((v) => v + 1);
  }, [rawElapsed, maxSeconds, state.running, matchId, half]);

  const suggestedMinute = useMemo(() => {
    if (half === "penalties") return 1;
    return periodMinuteFromElapsed(elapsedSec, maxMinutes);
  }, [elapsedSec, half, maxMinutes]);

  const clockLabel = useMemo(() => {
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsedSec]);

  function persist(next: ClockPersisted) {
    const capped =
      maxSeconds != null
        ? {
            ...next,
            baseElapsed: Math.min(next.baseElapsed, maxSeconds),
            running:
              next.running &&
              !(maxSeconds != null && next.baseElapsed >= maxSeconds),
            startedAt:
              next.running &&
              !(maxSeconds != null && next.baseElapsed >= maxSeconds)
                ? next.startedAt
                : null,
          }
        : next;
    writeClock(matchId, half, capped);
    setVersion((v) => v + 1);
  }

  /** Fresh read from storage — use when opening the event confirm dialog. */
  function minuteFromTimer(): number {
    if (half === "penalties") return 1;
    if (!Number.isFinite(matchId)) return 1;
    const saved = readClock(matchId, half) ?? {
      baseElapsed: 0,
      running: false,
      startedAt: null,
    };
    let sec = elapsedNow(saved);
    if (maxSeconds != null) sec = Math.min(sec, maxSeconds);
    return periodMinuteFromElapsed(sec, maxMinutes);
  }

  return {
    running: state.running && !atMax,
    atMax,
    maxMinutes,
    clockLabel,
    suggestedMinute,
    minuteFromTimer,
    elapsedSec,
    start: () => {
      if (atMax || (maxSeconds != null && elapsedNow(
        readClock(matchId, half) ?? {
          baseElapsed: 0,
          running: false,
          startedAt: null,
        },
      ) >= maxSeconds)) {
        return;
      }
      const current = elapsedNow(
        readClock(matchId, half) ?? {
          baseElapsed: 0,
          running: false,
          startedAt: null,
        },
      );
      persist({
        baseElapsed: current,
        running: true,
        startedAt: Date.now(),
      });
    },
    pause: () => {
      const current = elapsedNow(
        readClock(matchId, half) ?? {
          baseElapsed: 0,
          running: false,
          startedAt: null,
        },
      );
      persist({
        baseElapsed: maxSeconds != null ? Math.min(current, maxSeconds) : current,
        running: false,
        startedAt: null,
      });
    },
    reset: () => {
      persist({ baseElapsed: 0, running: false, startedAt: null });
    },
  };
}
