import { useEffect, useState } from "react";
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

const FLOW_B = [
  "Ustvari ali uporabi igralca",
  "Sandbox turnir ([SANDBOX] Player History Lab)",
  "Edicije cez vec let",
  "Random eventi (goli, kartoni) na heroju",
  "Profil z zgodovino in grafom",
] as const;

export function GeneratorAdminPage() {
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(true);

  const [busyA, setBusyA] = useState(false);
  const [errorA, setErrorA] = useState<unknown>(null);
  const [resultA, setResultA] = useState<GeneratorAResult | null>(null);
  const [seedA, setSeedA] = useState("");

  const [busyB, setBusyB] = useState(false);
  const [errorB, setErrorB] = useState<unknown>(null);
  const [resultB, setResultB] = useState<GeneratorBResult | null>(null);
  const [seedB, setSeedB] = useState("");
  const [yearsB, setYearsB] = useState("3");
  const [modeB, setModeB] = useState<"new" | "existing">("new");
  const [playerIdB, setPlayerIdB] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerOptions, setPlayerOptions] = useState<PlayerListItem[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  useEffect(() => {
    if (modeB !== "existing") return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      setPlayersLoading(true);
      void playerService
        .list({
          search: playerSearch.trim() || undefined,
          page_size: 30,
        })
        .then((page) => {
          if (!cancelled) setPlayerOptions(page.results);
        })
        .catch(() => {
          if (!cancelled) setPlayerOptions([]);
        })
        .finally(() => {
          if (!cancelled) setPlayersLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [modeB, playerSearch]);

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
                      placeholder="Priimek / ime…"
                      disabled={busyB}
                    />
                  </label>
                  <label>
                    Igralec
                    <select
                      value={playerIdB}
                      onChange={(e) => setPlayerIdB(e.target.value)}
                      disabled={busyB || playersLoading}
                    >
                      <option value="">
                        {playersLoading ? "Nalagam…" : "— izberi —"}
                      </option>
                      {playerOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} {formatPersonName(p.person)}
                          {p.position ? ` · ${p.position}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
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
