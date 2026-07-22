import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ErrorBanner,
  IntegerStepper,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAuth } from "@/shared/auth";
import { editionService } from "@/modules/editions/services/editionService";
import {
  matchService,
  type MatchListItem,
} from "@/modules/matches/services/matchService";

type MatchZone = "group" | "knockout" | "finals";

type MatchSection = {
  zone: MatchZone;
  title: string;
  matches: MatchListItem[];
};

function formatKickoff(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Wall-clock from ISO — backend stores kickoff as UTC; don't shift by browser TZ (+2).
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    return `${m[3]}.${m[2]}. ${m[4]}:${m[5]}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}. ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function parseHhMm(value: string): { hours: number; minutes: number } {
  const [hRaw, mRaw] = value.split(":");
  const hours = Math.min(23, Math.max(0, Number.parseInt(hRaw ?? "0", 10) || 0));
  const minutes = Math.min(59, Math.max(0, Number.parseInt(mRaw ?? "0", 10) || 0));
  return { hours, minutes };
}

function formatHhMm(hours: number, minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}`;
}

function parseOptionalInt(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** Same formula as MatchScheduleService._slot_minutes */
function slotPreview(
  halfDuration: string,
  halfBreak: string,
  buffer: string,
  ruleMatchDuration: number | null,
): { slot: number; formula: string } {
  const half = parseOptionalInt(halfDuration);
  const breakM = parseOptionalInt(halfBreak) ?? 0;
  const buf = parseOptionalInt(buffer) ?? 15;

  let duration: number;
  let durationPart: string;
  if (half != null && half >= 1) {
    duration = half * 2 + breakM;
    durationPart = `2×${half} + ${breakM} odmor`;
  } else if (ruleMatchDuration != null && ruleMatchDuration >= 1) {
    duration = ruleMatchDuration;
    durationPart = `pravila ${ruleMatchDuration} min`;
  } else {
    duration = 60;
    durationPart = "privzeto 60 min";
  }

  return {
    slot: duration + buf,
    formula: `${durationPart} + ${buf} buffer = ${duration + buf} min`,
  };
}

function TimeSpinUnit({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  ariaLabel: string;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");

  function bump(delta: number) {
    const next = value + delta;
    if (next < min || next > max) return;
    onChange(next);
  }

  function onInputChange(raw: string) {
    if (!/^\d{0,2}$/.test(raw)) return;
    if (raw === "") {
      onChange(min);
      return;
    }
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    onChange(Math.min(max, Math.max(min, n)));
  }

  return (
    <div className="time-spin-unit">
      <input
        className="time-spin-unit__input"
        type="text"
        inputMode="numeric"
        value={pad(value)}
        onChange={(e) => onInputChange(e.target.value)}
        aria-label={ariaLabel}
      />
      <div className="time-spin-unit__btns">
        <button
          type="button"
          className="time-spin-unit__btn border-frame border-frame--sm"
          onClick={() => bump(1)}
          disabled={value >= max}
          aria-label={`Povečaj ${ariaLabel.toLowerCase()}`}
        >
          +
        </button>
        <button
          type="button"
          className="time-spin-unit__btn border-frame border-frame--sm"
          onClick={() => bump(-1)}
          disabled={value <= min}
          aria-label={`Zmanjšaj ${ariaLabel.toLowerCase()}`}
        >
          −
        </button>
      </div>
    </div>
  );
}

/** Group stage → only group name; otherwise phase name. */
function phaseLabel(m: MatchListItem): string {
  if (m.phase_type === "group_stage") {
    return m.group_name || "Skupina";
  }
  return m.phase_name || `Faza #${m.tournament_phase}`;
}

function matchZone(m: MatchListItem): MatchZone {
  const type = m.phase_type || "";
  const name = (m.phase_name || "").trim().toLowerCase();

  if (type === "group_stage" || type === "league") return "group";
  if (type === "third_place") return "finals";
  // Exact "Finale" only — not Četrtfinale / Polfinale / Osmina finala
  if (type === "knockout" && name === "finale") return "finals";
  return "knockout";
}

function sortByKickoff(list: MatchListItem[]): MatchListItem[] {
  return [...list].sort((a, b) => {
    if (!a.match_date && !b.match_date) {
      return (a.match_number ?? a.id) - (b.match_number ?? b.id);
    }
    if (!a.match_date) return 1;
    if (!b.match_date) return -1;
    return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
  });
}

function buildSections(matches: MatchListItem[]): MatchSection[] {
  const group: MatchListItem[] = [];
  const knockout: MatchListItem[] = [];
  const finals: MatchListItem[] = [];

  for (const m of matches) {
    const zone = matchZone(m);
    if (zone === "group") group.push(m);
    else if (zone === "finals") finals.push(m);
    else knockout.push(m);
  }

  const sections: MatchSection[] = [];
  if (group.length) {
    sections.push({
      zone: "group",
      title: "Skupinski del",
      matches: sortByKickoff(group),
    });
  }
  if (knockout.length) {
    sections.push({
      zone: "knockout",
      title: "Knockout",
      matches: sortByKickoff(knockout),
    });
  }
  if (finals.length) {
    sections.push({
      zone: "finals",
      title: "Finale",
      matches: sortByKickoff(finals),
    });
  }
  return sections;
}

export function EditionMatchesPage() {
  const { id } = useParams();
  const editionId = Number(id);
  const { hasPermission, isAdmin } = useAuth();
  const canEdit =
    isAdmin ||
    hasPermission("match.manage", editionId) ||
    hasPermission("edition.manage", editionId);

  const [rows, setRows] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [editionStartDate, setEditionStartDate] = useState<string | null>(null);
  const [halfDuration, setHalfDuration] = useState("");
  const [halfBreak, setHalfBreak] = useState("");
  const [buffer, setBuffer] = useState("");
  const [showUrnik, setShowUrnik] = useState(false);
  const [ruleMatchDuration, setRuleMatchDuration] = useState<number | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [edition, page, cfg] = await Promise.all([
        editionService.get(editionId),
        matchService.list({
          tournament_edition: editionId,
          ordering: "match_date,tournament_phase__order,match_number",
          page_size: 500,
        }),
        editionService.getFormatConfig(editionId),
      ]);
      setEditionStartDate(edition.start_date);
      setRuleMatchDuration(
        edition.global_rule_template?.match_duration_minutes ?? null,
      );
      setHalfDuration(
        cfg.half_duration_minutes != null
          ? String(cfg.half_duration_minutes)
          : "",
      );
      setHalfBreak(
        cfg.half_time_break_minutes != null
          ? String(cfg.half_time_break_minutes)
          : "",
      );
      setBuffer(
        cfg.buffer_between_matches_minutes != null
          ? String(cfg.buffer_between_matches_minutes)
          : "",
      );
      setRows(page.results);
      setSelected(new Set());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [editionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(() => buildSections(rows), [rows]);

  const preview = useMemo(
    () => slotPreview(halfDuration, halfBreak, buffer, ruleMatchDuration),
    [halfDuration, halfBreak, buffer, ruleMatchDuration],
  );

  const displayedIds = useMemo(
    () => sections.flatMap((s) => s.matches.map((m) => m.id)),
    [sections],
  );

  const allSelected =
    displayedIds.length > 0 && displayedIds.every((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(displayedIds));
  }

  function toggleOne(matchId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  }

  async function saveTiming() {
    await editionService.updateFormatConfig(editionId, {
      half_duration_minutes: parseOptionalInt(halfDuration),
      half_time_break_minutes: parseOptionalInt(halfBreak),
      buffer_between_matches_minutes: parseOptionalInt(buffer),
    });
  }

  async function generateTimes() {
    const ok = window.confirm(
      `Generiram ure od ${editionStartDate ?? "začetka"} ob ${startTime} za vse tekme?\n` +
        `Razmik: ${preview.formula}`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await saveTiming();
      await editionService.scheduleMatchTimes(editionId, {
        start_time: startTime,
        overwrite: true,
      });
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveTimingClick() {
    setBusy(true);
    setError(null);
    try {
      await saveTiming();
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const colSpan = canEdit ? 9 : 8;
  const { hours: startHours, minutes: startMinutes } = parseHhMm(startTime);

  return (
    <div className="page">
      <PageHeader
        title="Tekme edicije"
        subtitle={
          editionStartDate
            ? `Razvrščeno po uri · začetek turnirja ${editionStartDate}`
            : `Edicija #${editionId}`
        }
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to={`/editions/${editionId}`}
          >
            ← Nazaj na edicijo
          </Link>
        }
      />

      <ErrorBanner error={error} />

      {canEdit ? (
        <section className="border-frame border-frame--md">
          <div
            className="row-actions"
            style={{
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.65rem",
              marginBottom: showUrnik ? "0.75rem" : 0,
            }}
          >
            <h2 style={{ margin: 0 }}>Urnik</h2>
            <button
              type="button"
              className="border-frame border-frame--sm"
              aria-expanded={showUrnik}
              aria-label={showUrnik ? "Skrij urnik" : "Prikaži urnik"}
              title={showUrnik ? "Skrij" : "Prikaži"}
              onClick={() => setShowUrnik((v) => !v)}
            >
              {showUrnik ? "−" : "+"}
            </button>
          </div>
          {showUrnik ? (
          <div className="stack-form group-stage-rules">
            <div className="group-stage-rules__grid">
              <label>
                Polčas (min)
                <IntegerStepper
                  value={halfDuration}
                  min={1}
                  max={90}
                  emptyMeansNull
                  onChange={setHalfDuration}
                />
              </label>
              <label>
                Odmor (min)
                <IntegerStepper
                  value={halfBreak}
                  min={0}
                  max={60}
                  emptyMeansNull
                  onChange={setHalfBreak}
                />
              </label>
              <label>
                Buffer med tekmami (min)
                <IntegerStepper
                  value={buffer}
                  min={0}
                  max={180}
                  emptyMeansNull
                  onChange={setBuffer}
                />
              </label>
              <label>
                Ura začetka
                <div
                  className="time-stepper"
                  role="group"
                  aria-label="Ura začetka"
                >
                  <TimeSpinUnit
                    value={startHours}
                    min={0}
                    max={23}
                    ariaLabel="Ure"
                    onChange={(h) =>
                      setStartTime(formatHhMm(h, startMinutes))
                    }
                  />
                  <span className="time-stepper__sep" aria-hidden>
                    :
                  </span>
                  <TimeSpinUnit
                    value={startMinutes}
                    min={0}
                    max={59}
                    ariaLabel="Minute"
                    onChange={(m) =>
                      setStartTime(formatHhMm(startHours, m))
                    }
                  />
                </div>
              </label>
            </div>
            <p className="schedule-slot-preview">
              Razmik med kickoffi: <strong>{preview.slot} min</strong>
              <span className="muted"> · {preview.formula}</span>
            </p>
            <div className="row-actions">
              <button
                type="button"
                className="border-frame border-frame--sm button-secondary"
                disabled={busy || loading}
                onClick={() => void onSaveTimingClick()}
              >
                Shrani razmik
              </button>
              <button
                type="button"
                className="border-frame border-frame--sm"
                disabled={busy || loading || rows.length === 0}
                onClick={() => void generateTimes()}
              >
                Generiraj ure od začetka turnirja
              </button>
            </div>
            <p className="muted">
              Če polčas ni nastavljen, se uporabi trajanje iz pravil edicije
              {ruleMatchDuration != null ? ` (${ruleMatchDuration} min)` : ""}
              , sicer 60 min. Prazen buffer = 15 min. Generiranje shrani razmik
              in nastavi ure za vse tekme.
            </p>
          </div>
          ) : null}
        </section>
      ) : null}

      {loading ? <StateMessage variant="loading" /> : null}
      {!loading && sections.length === 0 ? (
        <StateMessage variant="empty" message="Ni tekem." />
      ) : null}

      {!loading && sections.length > 0 ? (
        <section className="border-frame border-frame--md match-sections">
          <table className="data-table">
            <thead>
              <tr>
                {canEdit ? (
                  <th className="col-check">
                    <input
                      className="sketch-check border-frame border-frame--sm"
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Izberi vse"
                    />
                  </th>
                ) : null}
                <th>#</th>
                <th>Ura</th>
                <th>Faza</th>
                <th>Domači</th>
                <th>Gostje</th>
                <th>Rezultat</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <Fragment key={section.zone}>
                  <tr className="match-section-row">
                    <td colSpan={colSpan}>
                      <strong>{section.title}</strong>
                      <span className="muted">
                        {" "}
                        · {section.matches.length} tekem
                      </span>
                    </td>
                  </tr>
                  {section.matches.map((match) => (
                    <tr key={match.id}>
                      {canEdit ? (
                        <td className="col-check">
                          <input
                            className="sketch-check border-frame border-frame--sm"
                            type="checkbox"
                            checked={selected.has(match.id)}
                            onChange={() => toggleOne(match.id)}
                            aria-label={`Izberi tekmo ${match.id}`}
                          />
                        </td>
                      ) : null}
                      <td>{match.match_number ?? match.id}</td>
                      <td>{formatKickoff(match.match_date)}</td>
                      <td>{phaseLabel(match)}</td>
                      <td>{match.home_team_name ?? "TBD"}</td>
                      <td>{match.away_team_name ?? "TBD"}</td>
                      <td>
                        {match.home_score ?? "—"} : {match.away_score ?? "—"}
                      </td>
                      <td>
                        {match.status?.name ?? match.status?.code ?? "—"}
                      </td>
                      <td>
                        <Link to={`/matches/${match.id}`}>Detail</Link>
                        {" · "}
                        <Link to={`/live/matches/${match.id}`}>Live</Link>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
