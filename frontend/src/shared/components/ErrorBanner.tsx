import { isApiError } from "@/shared/api";

type Props = {
  error: unknown;
};

function formatDetails(details: unknown): string[] {
  if (!details || typeof details !== "object") return [];
  const rows: string[] = [];
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      rows.push(`${key}: ${value.map(String).join(", ")}`);
    } else if (value && typeof value === "object") {
      rows.push(`${key}: ${JSON.stringify(value)}`);
    } else if (value != null) {
      rows.push(`${key}: ${String(value)}`);
    }
  }
  return rows;
}

export function ErrorBanner({ error }: Props) {
  if (!error) return null;

  if (isApiError(error)) {
    const detailRows = formatDetails(error.details);
    return (
      <div className="error-banner border-frame border-frame--md" role="alert">
        <strong>{error.message}</strong>
        {detailRows.length > 0 ? (
          <ul className="plain-list" style={{ margin: "0.35rem 0 0" }}>
            {detailRows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>
        ) : null}
        <div className="muted">
          code: {error.code}
          {error.requestId ? ` · request: ${error.requestId}` : ""}
        </div>
      </div>
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected error occurred.";

  return (
    <div className="error-banner border-frame border-frame--md" role="alert">
      <strong>{message}</strong>
    </div>
  );
}
