import { getShirtColor, shirtColorLabel } from "@/shared/constants/shirtColors";

type Props = {
  code: string | null | undefined;
};

export function ShirtColorBadge({ code }: Props) {
  const color = getShirtColor(code);
  if (!color && !code) return <span>—</span>;
  return (
    <span className="country-option">
      <span
        className="shirt-color-chip shirt-color-chip--inline"
        style={{ backgroundColor: color?.hex ?? "#ccc" }}
        title={shirtColorLabel(code)}
      />
      {shirtColorLabel(code)}
    </span>
  );
}
