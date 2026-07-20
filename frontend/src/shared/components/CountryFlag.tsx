import DE from "country-flag-icons/react/3x2/DE";
import DK from "country-flag-icons/react/3x2/DK";
import ES from "country-flag-icons/react/3x2/ES";
import FI from "country-flag-icons/react/3x2/FI";
import FR from "country-flag-icons/react/3x2/FR";
import GBENG from "country-flag-icons/react/3x2/GB-ENG";
import GBNIR from "country-flag-icons/react/3x2/GB-NIR";
import GBSCT from "country-flag-icons/react/3x2/GB-SCT";
import GBWLS from "country-flag-icons/react/3x2/GB-WLS";
import IE from "country-flag-icons/react/3x2/IE";
import IS from "country-flag-icons/react/3x2/IS";
import NO from "country-flag-icons/react/3x2/NO";
import PT from "country-flag-icons/react/3x2/PT";
import RU from "country-flag-icons/react/3x2/RU";
import SE from "country-flag-icons/react/3x2/SE";
import UA from "country-flag-icons/react/3x2/UA";
import {
  AT,
  BA,
  HR,
  HU,
  IT,
  ME,
  MK,
  RS,
  SI,
  type FlagComponent,
} from "country-flag-icons/react/3x2";

const FLAGS: Record<string, FlagComponent> = {
  SI,
  HR,
  RS,
  BA,
  ME,
  MK,
  IT,
  AT,
  HU,
  DE,
  FR,
  ES,
  PT,
  "GB-ENG": GBENG,
  "GB-SCT": GBSCT,
  "GB-WLS": GBWLS,
  "GB-NIR": GBNIR,
  IE,
  SE,
  NO,
  DK,
  FI,
  IS,
  RU,
  UA,
};

type Props = {
  iso2: string;
  title?: string;
  className?: string;
};

export function CountryFlag({ iso2, title, className }: Props) {
  const code = iso2.toUpperCase();
  const Flag = FLAGS[code];
  if (!Flag) {
    return (
      <span className={className} title={title ?? code} aria-hidden>
        {code}
      </span>
    );
  }
  return (
    <Flag title={title ?? code} className={className ?? "country-flag"} />
  );
}
