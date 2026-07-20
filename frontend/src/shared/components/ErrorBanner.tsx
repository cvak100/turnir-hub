import { isApiError } from "@/shared/api";

type Props = {
  error: unknown;
};

export function ErrorBanner({ error }: Props) {
  if (!error) return null;

  if (isApiError(error)) {
    return (
      <div className="error-banner border-frame border-frame--md" role="alert">
        <strong>{error.message}</strong>
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
