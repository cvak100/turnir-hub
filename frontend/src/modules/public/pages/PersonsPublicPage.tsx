import {
  ErrorBanner,
  PageHeader,
  StateMessage,
} from "@/shared/components";
import { useAsyncData } from "@/shared/hooks/useAsyncData";
import { publicApi } from "@/modules/public/services/publicApi";

function displayName(p: {
  first_name: string;
  last_name: string;
  nickname: string;
}): string {
  const full = `${p.last_name} ${p.first_name}`.trim();
  return full || p.nickname || "#";
}

export function PersonsPublicPage() {
  const list = useAsyncData(() => publicApi.listPersons(), []);

  return (
    <div className="page">
      <PageHeader
        title="Osebe / igralci"
        subtitle="Javni seznam — osnovni podatki."
      />
      <ErrorBanner error={list.error} />
      {list.loading ? <StateMessage variant="loading" /> : null}
      {!list.loading && (list.data?.results.length ?? 0) === 0 ? (
        <StateMessage variant="empty" message="Ni javnih oseb." />
      ) : null}
      {list.data && list.data.results.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ime</th>
                <th>Vzdevek</th>
                <th>Kraj</th>
                <th>Državljanstvo</th>
              </tr>
            </thead>
            <tbody>
              {list.data.results.map((p) => (
                <tr key={p.id}>
                  <td>{displayName(p)}</td>
                  <td>{p.nickname || "—"}</td>
                  <td>{p.city || "—"}</td>
                  <td>{p.nationality_name || p.country || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
