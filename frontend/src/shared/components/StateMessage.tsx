type Props = {
  variant: "loading" | "empty" | "error";
  title?: string;
  message?: string;
};

const defaults: Record<Props["variant"], { title: string; message: string }> = {
  loading: { title: "Loading", message: "Please wait…" },
  empty: { title: "Nothing here yet", message: "No items to show." },
  error: { title: "Something went wrong", message: "Please try again." },
};

export function StateMessage({ variant, title, message }: Props) {
  const fallback = defaults[variant];
  return (
    <div className={`state-message state-${variant}`} role="status">
      <strong>{title ?? fallback.title}</strong>
      <p>{message ?? fallback.message}</p>
    </div>
  );
}
