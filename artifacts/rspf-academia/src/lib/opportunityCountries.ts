export type OpportunityCountryOption = {
  isoCode: string;
  name: string;
  nameEn: string;
  flag: string;
};

// ISO 3166-1 alpha-2 includes countries and territories with assigned codes.
const ISO_3166_ALPHA_2_CODES = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT
MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG
UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`.trim().split(/\s+/);

const countryNamesAr = new Intl.DisplayNames(["ar"], { type: "region" });
const countryNamesEn = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRY_NAME_OVERRIDES: Record<string, { name: string; nameEn: string }> = {
  PS: { name: "فلسطين", nameEn: "Palestine" },
  TR: { name: "تركيا", nameEn: "Turkey" },
};

function countryFlag(isoCode: string) {
  return Array.from(isoCode.toUpperCase(), (letter) =>
    String.fromCodePoint(127397 + letter.charCodeAt(0)),
  ).join("");
}

export const OPPORTUNITY_COUNTRIES: OpportunityCountryOption[] = ISO_3166_ALPHA_2_CODES
  .map((isoCode) => ({
    isoCode,
    name: COUNTRY_NAME_OVERRIDES[isoCode]?.name || countryNamesAr.of(isoCode) || isoCode,
    nameEn: COUNTRY_NAME_OVERRIDES[isoCode]?.nameEn || countryNamesEn.of(isoCode) || isoCode,
    flag: countryFlag(isoCode),
  }))
  .sort((a, b) => a.name.localeCompare(b.name, "ar"));

export function localizeOpportunityCountry(value: string, language: string) {
  const normalized = value.trim().toLocaleLowerCase();
  const country = OPPORTUNITY_COUNTRIES.find((item) =>
    item.name.toLocaleLowerCase() === normalized || item.nameEn.toLocaleLowerCase() === normalized,
  );
  return country ? (language === "ar" ? country.name : country.nameEn) : value;
}
