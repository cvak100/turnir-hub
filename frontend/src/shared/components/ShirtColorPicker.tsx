import { SHIRT_COLORS } from "@/shared/constants/shirtColors";

type Props = {
  label: string;
  value: string;
  onChange: (code: string) => void;
  name: string;
};

export function ShirtColorPicker({ label, value, onChange, name }: Props) {
  return (
    <fieldset className="shirt-color-fieldset">
      <legend>{label}</legend>
      <div className="shirt-color-grid">
        <label className="shirt-color-swatch shirt-color-none">
          <input
            type="radio"
            name={name}
            value=""
            checked={value === ""}
            onChange={() => onChange("")}
          />
          <span className="shirt-color-chip" title="Brez">
            —
          </span>
        </label>
        {SHIRT_COLORS.map((c) => (
          <label key={c.code} className="shirt-color-swatch">
            <input
              type="radio"
              name={name}
              value={c.code}
              checked={value === c.code}
              onChange={() => onChange(c.code)}
            />
            <span
              className="shirt-color-chip"
              style={{ backgroundColor: c.hex }}
              title={c.label}
            />
          </label>
        ))}
      </div>
      <p className="muted shirt-color-selected">
        {value
          ? SHIRT_COLORS.find((c) => c.code === value)?.label
          : "ni izbrano"}
      </p>
    </fieldset>
  );
}
