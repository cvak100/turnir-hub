import { getShirtColor, shirtColorLabel } from "@/shared/constants/shirtColors";

type Props = {
  topCode?: string | null;
  bottomCode?: string | null;
  size?: number;
};

const FALLBACK = "#d4d0c4";
const STROKE = "#333";

function JerseyIcon({ fill, size }: { fill: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className="kit-icon"
    >
      <path
        d="M20 10 L28 14 L32 12 L36 14 L44 10 L52 18 L46 24 L46 54 L18 54 L18 24 L12 18 Z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M28 14 L32 18 L36 14"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShortsIcon({ fill, size }: { fill: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className="kit-icon"
    >
      {/* Men's football shorts — wide waist, short legs, centre split */}
      <path
        d="M14 20
           C14 18 16 16 20 16
           H44
           C48 16 50 18 50 20
           V30
           L54 46
           C54.5 48 53 50 50.5 50
           H37
           L32 34
           L27 50
           H13.5
           C11 50 9.5 48 10 46
           L14 30
           Z"
        fill={fill}
        stroke={STROKE}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* waistband */}
      <path
        d="M15 22 H49"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.6"
        opacity="0.5"
      />
      {/* side vents hint */}
      <path
        d="M16 30 L12 42 M48 30 L52 42"
        fill="none"
        stroke={STROKE}
        strokeWidth="1.2"
        opacity="0.35"
      />
    </svg>
  );
}

export function KitPreview({ topCode, bottomCode, size = 56 }: Props) {
  const top = getShirtColor(topCode);
  const bottom = getShirtColor(bottomCode);
  const topFill = top?.hex ?? FALLBACK;
  const bottomFill = bottom?.hex ?? FALLBACK;

  return (
    <div className="kit-preview" role="img" aria-label="Barve dresa">
      <div className="kit-preview-item">
        <JerseyIcon fill={topFill} size={size} />
        <span className="muted">{shirtColorLabel(topCode)}</span>
      </div>
      <div className="kit-preview-item">
        <ShortsIcon fill={bottomFill} size={size} />
        <span className="muted">{shirtColorLabel(bottomCode)}</span>
      </div>
    </div>
  );
}
