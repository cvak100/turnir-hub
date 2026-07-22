import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import {
  normalizeList,
  publicApi,
} from "@/modules/public/services/publicApi";

export function StatsPage() {
  const [params] = useSearchParams();
  const initialEdition = Number(params.get("edition") || "") || "";
  const [editionId, setEditionId] = useState<number | "">(initialEdition);

  const editions = useAsyncData(() => publicApi.listEditions(), []);
  const players = useAsyncData(
    () =>
      editionId
        ? publicApi.listEditionPlayers(Number(editionId))
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [editionId],
  );
  const awards = useAsyncData(
    () =>
      editionId
        ? publicApi.listAwards(Number(editionId))
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [editionId],
  );

  const scorers = useMemo(() => {
    return [...(players.data?.results ?? [])]
      .filter((p) => (p.goals ?? 0) > 0)
      .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))
      .slice(0, 20);
  }, [players.data]);

  const cards = useMemo(() => {
    return [...(players.data?.results ?? [])]
      .filter((p) => (p.yellow_cards ?? 0) + (p.red_cards ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.yellow_cards ?? 0) +
          (b.red_cards ?? 0) * 2 -
          ((a.yellow_cards ?? 0) + (a.red_cards ?? 0) * 2),
      )
      .slice(0, 20);
  }, [players.data]);

  const awardRows = normalizeList(awards.data);

  return (
    <div className="page">
      <PageHeader
        title="Statistika"
        subtitle="Strelci, kartoni in nagrade po ediciji."
      />
      <ErrorBanner error={editions.error ?? players.error ?? awards.error} />

      <label className="stack-form border-frame border-frame--md">
        Edicija
        <select
          value={editionId === "" ? "" : String(editionId)}
          onChange={(e) =>
            setEditionId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">— izberi edicijo —</option>
          {(editions.data?.results ?? []).map((ed) => (
            <option key={ed.id} value={ed.id}>
              {ed.name} ({ed.year})
            </option>
          ))}
        </select>
      </label>

      {!editionId ? (
        <StateMessage
          variant="empty"
          message="Izberi edicijo za prikaz statistike."
        />
      ) : null}

      {editionId && players.loading ? <StateMessage variant="loading" /> : null}

      {editionId && !players.loading ? (
        <>
          <section className="border-frame border-frame--md">
            <h2>Najboljši strelci</h2>
            {scorers.length === 0 ? (
              <p className="muted">Ni podatkov.</p>
            ) : (
              <ol className="plain-list">
                {scorers.map((p) => {
                  const person = p.player?.person;
                  const name = person
                    ? `${person.last_name} ${person.first_name}`.trim() ||
                      person.nickname
                    : `#${p.player?.id}`;
                  return (
                    <li key={p.id}>
                      {name} — {p.goals}{" "}
                      {p.team_name ? `(${p.team_name})` : ""}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Kartoni</h2>
            {cards.length === 0 ? (
              <p className="muted">Ni podatkov.</p>
            ) : (
              <ul className="plain-list">
                {cards.map((p) => {
                  const person = p.player?.person;
                  const name = person
                    ? `${person.last_name} ${person.first_name}`.trim() ||
                      person.nickname
                    : `#${p.player?.id}`;
                  return (
                    <li key={p.id}>
                      {name}: {p.yellow_cards ?? 0} rumenih, {p.red_cards ?? 0}{" "}
                      rdečih
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="border-frame border-frame--md">
            <h2>Nagrajenci / MVP</h2>
            {awardRows.length === 0 ? (
              <p className="muted">Ni nagrad za to edicijo.</p>
            ) : (
              <ul className="plain-list">
                {awardRows.map((a) => (
                  <li key={a.id}>
                    {a.award?.name}: {a.player_name ?? a.player}
                    {a.team_name ? ` (${a.team_name})` : ""}
                  </li>
                ))}
              </ul>
            )}
            <p>
              <Link to={`/editions/${editionId}#awards`}>Nazaj na edicijo</Link>
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
