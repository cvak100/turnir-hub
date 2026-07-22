import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { api } from "@/shared/api";
import { formatPersonName } from "@/shared/utils/format";
import {
  playerService,
  type PlayerListItem,
} from "@/modules/players/services/playerService";

function playerMatchesSearch(player: PlayerListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (String(player.id).includes(q)) return true;
  const person = player.person;
  if (!person) return false;
  const haystack = [
    person.first_name,
    person.last_name,
    person.nickname,
    formatPersonName(person),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

type GeneratorStep = {
  step: string;
  message: string;
  id?: number;
  count?: number;
  teams?: string[];
  results?: Array<{ match_id: number; score: string; events: number }>;
  year?: number;
  hero_goals?: number;
  score?: string;
  events?: number;
};

type GeneratorAResult = {
  tournament_id: number;
  edition_id: number;
  tournament_name: string;
  champion: string | null;
  final_score: string;
  steps: GeneratorStep[];
  links: {
    tournament: string;
    edition: string;
    matches: string;
    players: string;
  };
};

type GeneratorAAResult = {
  tournament_id: number;
  edition_id: number;
  tournament_name: string;
  champion: string | null;
  final_score: string;
  edition_status: string | null;
  groups: number;
  teams: number;
  steps: GeneratorStep[];
  links: {
    tournament: string;
    edition: string;
    matches: string;
    players: string;
    finish: string;
    phases: string;
  };
};

type GeneratorBResult = {
  player_id: number;
  player_name: string;
  tournament_id: number;
  tournament_name: string;
  years: number[];
  steps: GeneratorStep[];
  links: {
    player: string;
    tournament: string;
    edition: string;
  };
};

const FLOW_A = [
  "Turnir (Trojke / knockout)",
  "4 ekipe + 5 igralcev na ekipo",
  "Faze: Polfinale, Za 3. mesto, Finale",
  "Simulacija tekem (goli + rumene)",
  "Zakljucek turnirja",
] as const;

const FLOW_AA = [
  "Format group_knockout (Trojke)",
  "12 ekip, 4 skupine po 3",
  "5 igralcev na ekipo + roster",
  "Round-robin v skupinah → 1. naprej",
  "Polfinale, 3. mesto, finale (odigrano)",
  "Edicija ostane ongoing (za /finish)",
] as const;

const FLOW_B = [
  "Ustvari ali uporabi igralca",
  "Sandbox turnir ([SANDBOX] Player History Lab)",
  "Edicije cez vec let",
  "Random eventi (goli, kartoni) na heroju",
  "Profil z zgodovino in grafom",
] as const;

export function GeneratorAdminPage() {
  const [showA, setShowA] = useState(false);
  const [showAA, setShowAA] = useState(true);
  const [showB, setShowB] = useState(false);

  const [busyA, setBusyA] = useState(false);
  const [errorA, setErrorA] = useState<unknown>(null);
  const [resultA, setResultA] = useState<GeneratorAResult | null>(null);
  const [seedA, setSeedA] = useState("");

  const [busyAA, setBusyAA] = useState(false);
  const [errorAA, setErrorAA] = useState<unknown>(null);
  const [resultAA, setResultAA] = useState<GeneratorAAResult | null>(null);
  const [seedAA, setSeedAA] = useState("");

  const [busyB, setBusyB] = useState(false);
  const [errorB, setErrorB] = useState<unknown>(null);
  const [resultB, setResultB] = useState<GeneratorBResult | null>(null);
  const [seedB, setSeedB] = useState("");
  const [yearsB, setYearsB] = useState("3");
  const [modeB, setModeB] = useState<"new" | "existing">("new");
  const [playerIdB, setPlayerIdB] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [allPlayers, setAllPlayers] = useState<PlayerListItem[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playersError, setPlayersError] = useState<unknown>(null);

  useEffect(() => {
    if (modeB !== "existing") return;
    let cancelled = false;
    setPlayersLoading(true);
    setPlayersError(null);
    void playerService
      .list({ page_size: 100 })
      .then((page) => {
        if (!cancelled) setAllPlayers(page.results ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setAllPlayers([]);
          setPlayersError(err);
        }
      })
      .finally(() => {
        if (!cancelled) setPlayersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modeB]);

  const playerOptions = useMemo(() => {
    const filtered = allPlayers.filter((p) =>
      playerMatchesSearch(p, playerSearch),
    );
    const selectedId = Number.parseInt(playerIdB, 10);
    if (!Number.isFinite(selectedId)) return filtered;
    if (filtered.some((p) => p.id === selectedId)) return filtered;
    const selected = allPlayers.find((p) => p.id === selectedId);
    return selected ? [selected, ...filtered] : filtered;
  }, [allPlayers, playerSearch, playerIdB]);

  const selectedPlayer = useMemo(
    () => allPlayers.find((p) => String(p.id) === playerIdB) ?? null,
    [allPlayers, playerIdB],
  );

  async function runA() {
    setBusyA(true);
    setErrorA(null);
    setResultA(null);
    try {
      const body: { seed?: number } = {};
      if (seedA.trim() !== "") body.seed = Number.parseInt(seedA, 10);
      const data = await api.post<GeneratorAResult>(
        "/admin/generator/demo-tournament/",
        body,
      );
      setResultA(data);
    } catch (err) {
      setErrorA(err);
    } finally {
      setBusyA(false);
    }
  }

  async function runAA() {
    setBusyAA(true);
    setErrorAA(null);
    setResultAA(null);
    try {
      const body: { seed?: number } = {};
      if (seedAA.trim() !== "") body.seed = Number.parseInt(seedAA, 10);
      const data = await api.post<GeneratorAAResult>(
        "/admin/generator/group-knockout/",
        body,
      );
      setResultAA(data);
    } catch (err) {
      setErrorAA(err);
    } finally {
      setBusyAA(false);
    }
  }

  async function runB() {
    setBusyB(true);
    setErrorB(null);
    setResultB(null);
    try {
      const body: {
        seed?: number;
        years?: number;
        player_id?: number;
      } = {
        years: Number.parseInt(yearsB, 10) || 3,
      };
      if (seedB.trim() !== "") body.seed = Number.parseInt(seedB, 10);
      if (modeB === "existing") {
        const id = Number.parseInt(playerIdB, 10);
        if (!Number.isFinite(id)) {
          throw new Error("Izberi igralca.");
        }
        body.player_id = id;
      }
      const data = await api.post<GeneratorBResult>(
        "/admin/generator/player-history/",
        body,
      );
      setResultB(data);
    } catch (err) {
      setErrorB(err);
    } finally {
      setBusyB(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Generator"
        subtitle="Demo orodja za turnirje in zgodovino igralcev"
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to="/dashboard_admin"
          >
            Nazaj na admin
          </Link>
        }
      />

      {/* Generator A */}
      <section className="border-frame border-frame--md">
        <div
          className="row-actions"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: showA ? "0.75rem" : 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Generator A</h2>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              Celoten Trojke knockout flow (4 ekipe).
            </p>
          </div>
          <button
            type="button"
            className="border-frame border-frame--sm"
            aria-expanded={showA}
            onClick={() => setShowA((v) => !v)}
          >
            {showA ? "−" : "+"}
          </button>
        </div>

        {showA ? (
          <>
            <ErrorBanner error={errorA} />
            <ol className="generator-flow">
              {FLOW_A.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <div className="stack-form">
              <label>
                Seed (opcijsko)
                <input
                  type="number"
                  value={seedA}
                  onChange={(e) => setSeedA(e.target.value)}
                  placeholder="npr. 42"
                  disabled={busyA}
                />
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="border-frame border-frame--sm"
                  disabled={busyA}
                  onClick={() => void runA()}
                >
                  {busyA ? "Generiram…" : "Generiraj demo turnir"}
                </button>
              </div>
            </div>
            {busyA ? (
              <StateMessage variant="loading" message="Ustvarjam turnir…" />
            ) : null}
            {resultA ? (
              <div className="generator-result" style={{ marginTop: "1rem" }}>
                <p className="generator-result__champ">
                  Zmagovalec: <strong>{resultA.champion ?? "—"}</strong>
                  {resultA.final_score ? (
                    <span className="muted">
                      {" "}
                      · finale {resultA.final_score}
                    </span>
                  ) : null}
                </p>
                <p>
                  <strong>{resultA.tournament_name}</strong>
                  <span className="muted">
                    {" "}
                    · #{resultA.tournament_id} / edicija #{resultA.edition_id}
                  </span>
                </p>
                <div className="row-actions" style={{ marginBottom: "0.75rem" }}>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultA.links.edition}
                  >
                    Edicija
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultA.links.matches}
                  >
                    Tekme
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultA.links.players}
                  >
                    Igralci
                  </Link>
                </div>
                <ol className="generator-steps">
                  {resultA.steps.map((s, i) => (
                    <li key={`${s.step}-${i}`}>
                      <strong>{s.message}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {/* Generator AA */}
      <section className="border-frame border-frame--md">
        <div
          className="row-actions"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: showAA ? "0.75rem" : 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Generator AA</h2>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              Skupine + izpadanje (12 ekip, 4×3, zmagovalci v PF). Brez
              zaključka.
            </p>
          </div>
          <button
            type="button"
            className="border-frame border-frame--sm"
            aria-expanded={showAA}
            onClick={() => setShowAA((v) => !v)}
          >
            {showAA ? "−" : "+"}
          </button>
        </div>

        {showAA ? (
          <>
            <ErrorBanner error={errorAA} />
            <ol className="generator-flow">
              {FLOW_AA.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <div className="stack-form">
              <label>
                Seed (opcijsko)
                <input
                  type="number"
                  value={seedAA}
                  onChange={(e) => setSeedAA(e.target.value)}
                  placeholder="npr. 42"
                  disabled={busyAA}
                />
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="border-frame border-frame--sm"
                  disabled={busyAA}
                  onClick={() => void runAA()}
                >
                  {busyAA ? "Generiram…" : "Generiraj skupine + KO"}
                </button>
              </div>
            </div>
            {busyAA ? (
              <StateMessage
                variant="loading"
                message="Ustvarjam skupine in izpadanje…"
              />
            ) : null}
            {resultAA ? (
              <div className="generator-result" style={{ marginTop: "1rem" }}>
                <p className="generator-result__champ">
                  Zmagovalec finala:{" "}
                  <strong>{resultAA.champion ?? "—"}</strong>
                  {resultAA.final_score ? (
                    <span className="muted">
                      {" "}
                      · finale {resultAA.final_score}
                    </span>
                  ) : null}
                </p>
                <p>
                  <strong>{resultAA.tournament_name}</strong>
                  <span className="muted">
                    {" "}
                    · #{resultAA.tournament_id} / edicija #
                    {resultAA.edition_id} · status{" "}
                    {resultAA.edition_status ?? "—"}
                  </span>
                </p>
                <div className="row-actions" style={{ marginBottom: "0.75rem" }}>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultAA.links.edition}
                  >
                    Edicija
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultAA.links.phases}
                  >
                    Faze
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultAA.links.matches}
                  >
                    Tekme
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultAA.links.players}
                  >
                    Igralci
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultAA.links.finish}
                  >
                    Zaključek
                  </Link>
                </div>
                <ol className="generator-steps">
                  {resultAA.steps.map((s, i) => (
                    <li key={`${s.step}-${i}`}>
                      <strong>{s.message}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {/* Generator B */}
      <section className="border-frame border-frame--md">
        <div
          className="row-actions"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: showB ? "0.75rem" : 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Generator B</h2>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              Igralec + zgodovina (sandbox turnir, vec let, eventi).
            </p>
          </div>
          <button
            type="button"
            className="border-frame border-frame--sm"
            aria-expanded={showB}
            onClick={() => setShowB((v) => !v)}
          >
            {showB ? "−" : "+"}
          </button>
        </div>

        {showB ? (
          <>
            <ErrorBanner error={errorB} />
            <ol className="generator-flow">
              {FLOW_B.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className="muted">
              Ce sandbox turnir obstaja, ga ponovno uporabi in doda edicije /
              dogodke. Namen: poln player profil (statistika, zgodovina, graf).
            </p>

            <div className="stack-form">
              <label>
                Nacin
                <select
                  value={modeB}
                  onChange={(e) =>
                    setModeB(e.target.value === "existing" ? "existing" : "new")
                  }
                  disabled={busyB}
                >
                  <option value="new">Nov igralec</option>
                  <option value="existing">Obstojeci igralec</option>
                </select>
              </label>

              {modeB === "existing" ? (
                <>
                  <label>
                    Iskanje igralca
                    <input
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Ime, priimek, vzdevek ali ID…"
                      disabled={busyB || playersLoading}
                      autoComplete="off"
                    />
                  </label>
                  {playersError ? <ErrorBanner error={playersError} /> : null}
                  {playersLoading ? (
                    <p className="muted">Nalagam igralce…</p>
                  ) : null}
                  {!playersLoading && selectedPlayer ? (
                    <p style={{ margin: 0 }}>
                      Izbran:{" "}
                      <strong>
                        #{selectedPlayer.id}{" "}
                        {formatPersonName(selectedPlayer.person)}
                      </strong>{" "}
                      <button
                        type="button"
                        className="button-link"
                        disabled={busyB}
                        onClick={() => setPlayerIdB("")}
                      >
                        Počisti
                      </button>
                    </p>
                  ) : null}
                  {!playersLoading && playerOptions.length === 0 ? (
                    <p className="muted">Ni zadetkov.</p>
                  ) : null}
                  {!playersLoading && playerOptions.length > 0 ? (
                    <>
                      <p className="muted" style={{ margin: 0 }}>
                        Klikni igralca ({playerOptions.length}
                        {playerSearch.trim()
                          ? ` od ${allPlayers.length}`
                          : ""}
                        )
                      </p>
                      <ul className="live-player-pick-list">
                        {playerOptions.map((p) => {
                          const selected = String(p.id) === playerIdB;
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                className={
                                  selected
                                    ? "live-roster-btn live-roster-btn--active border-frame border-frame--sm"
                                    : "live-roster-btn border-frame border-frame--sm"
                                }
                                disabled={busyB}
                                aria-pressed={selected}
                                onClick={() => setPlayerIdB(String(p.id))}
                              >
                                <span className="live-roster-btn__num">
                                  #{p.id}
                                </span>
                                {formatPersonName(p.person)}
                                {p.position ? ` · ${p.position}` : ""}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : null}
                </>
              ) : null}

              <label>
                Stevilo let (1–6)
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={yearsB}
                  onChange={(e) => setYearsB(e.target.value)}
                  disabled={busyB}
                />
              </label>
              <label>
                Seed (opcijsko)
                <input
                  type="number"
                  value={seedB}
                  onChange={(e) => setSeedB(e.target.value)}
                  placeholder="npr. 7"
                  disabled={busyB}
                />
              </label>

              <div className="row-actions">
                <button
                  type="button"
                  className="border-frame border-frame--sm"
                  disabled={busyB}
                  onClick={() => void runB()}
                >
                  {busyB ? "Generiram…" : "Generiraj zgodovino igralca"}
                </button>
              </div>
            </div>

            {busyB ? (
              <StateMessage
                variant="loading"
                message="Pripravljam sandbox zgodovino…"
              />
            ) : null}

            {resultB ? (
              <div className="generator-result" style={{ marginTop: "1rem" }}>
                <p className="generator-result__champ">
                  Igralec: <strong>{resultB.player_name}</strong>
                  <span className="muted">
                    {" "}
                    · leta {resultB.years.join(", ")}
                  </span>
                </p>
                <p className="muted">{resultB.tournament_name}</p>
                <div className="row-actions" style={{ marginBottom: "0.75rem" }}>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultB.links.player}
                  >
                    Profil igralca
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultB.links.edition}
                  >
                    Zadnja edicija
                  </Link>
                  <Link
                    className="button-link border-frame border-frame--sm"
                    to={resultB.links.tournament}
                  >
                    Sandbox turnir
                  </Link>
                </div>
                <ol className="generator-steps">
                  {resultB.steps.map((s, i) => (
                    <li key={`${s.step}-${i}`}>
                      <strong>{s.message}</strong>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
