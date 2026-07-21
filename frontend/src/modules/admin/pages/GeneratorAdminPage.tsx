import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { api } from "@/shared/api";

type GeneratorStep = {
  step: string;
  message: string;
  id?: number;
  count?: number;
  teams?: string[];
  results?: Array<{ match_id: number; score: string; events: number }>;
};

type GeneratorResult = {
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

const FLOW = [
  "Turnir (Trojke / knockout)",
  "4 ekipe + 5 igralcev na ekipo",
  "Faze: Polfinale, Za 3. mesto, Finale",
  "Simulacija tekem (goli + rumene)",
  "Zaključek turnirja",
] as const;

export function GeneratorAdminPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [seed, setSeed] = useState("");

  async function runGenerator() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body: { seed?: number } = {};
      if (seed.trim() !== "") {
        body.seed = Number.parseInt(seed, 10);
      }
      const data = await api.post<GeneratorResult>(
        "/admin/generator/demo-tournament/",
        body,
      );
      setResult(data);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Generator"
        subtitle="Demo flow za celoten turnir"
        actions={
          <Link
            className="button-link border-frame border-frame--sm"
            to="/dashboard_admin"
          >
            Nazaj na admin
          </Link>
        }
      />

      <ErrorBanner error={error} />

      <section className="border-frame border-frame--md">
        <h2>Kaj naredi</h2>
        <ol className="generator-flow">
          {FLOW.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="muted">
          Format: knockout · kategorija Trojke · pravila Trojke 3v3 · 4 ekipe ·
          polfinale + 3. mesto + finale · naključni dogodki.
        </p>
      </section>

      <section className="border-frame border-frame--md stack-form">
        <label>
          Seed (opcijsko, za ponovljiv random)
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="npr. 42"
            disabled={busy}
          />
        </label>
        <div className="row-actions">
          <button
            type="button"
            className="border-frame border-frame--sm"
            disabled={busy}
            onClick={() => void runGenerator()}
          >
            {busy ? "Generiram…" : "Generiraj demo turnir"}
          </button>
        </div>
      </section>

      {busy ? (
        <StateMessage variant="loading" message="Ustvarjam turnir…" />
      ) : null}

      {result ? (
        <section className="border-frame border-frame--lg generator-result">
          <h2>Rezultat</h2>
          <p className="generator-result__champ">
            Zmagovalec: <strong>{result.champion ?? "—"}</strong>
            {result.final_score ? (
              <span className="muted"> · finale {result.final_score}</span>
            ) : null}
          </p>
          <p>
            <strong>{result.tournament_name}</strong>
            <span className="muted">
              {" "}
              · turnir #{result.tournament_id} · edicija #{result.edition_id}
            </span>
          </p>

          <div className="row-actions" style={{ marginBottom: "1rem" }}>
            <Link
              className="button-link border-frame border-frame--sm"
              to={result.links.edition}
            >
              Edicija
            </Link>
            <Link
              className="button-link border-frame border-frame--sm"
              to={result.links.matches}
            >
              Tekme
            </Link>
            <Link
              className="button-link border-frame border-frame--sm"
              to={result.links.players}
            >
              Igralci
            </Link>
            <Link
              className="button-link border-frame border-frame--sm"
              to={result.links.tournament}
            >
              Turnir (admin)
            </Link>
          </div>

          <h3>Koraki</h3>
          <ol className="generator-steps">
            {result.steps.map((s, i) => (
              <li key={`${s.step}-${i}`}>
                <strong>{s.message}</strong>
                {s.teams?.length ? (
                  <div className="muted">{s.teams.join(" · ")}</div>
                ) : null}
                {s.results?.length ? (
                  <ul className="plain-list">
                    {s.results.map((r) => (
                      <li key={r.match_id}>
                        Tekma #{r.match_id}: {r.score} ({r.events} dogodkov)
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
