/** Static Warsaw landmarks / districts for offline address search. */
export type WarsawAddress = {
  id: string;
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
};

export const WARSAW_ADDRESSES: WarsawAddress[] = [
  {
    id: "addr-centrum",
    label: "Centrum",
    subtitle: "District · Warsaw",
    lat: 52.2297,
    lng: 21.0122,
  },
  {
    id: "addr-mokotow",
    label: "Mokotów",
    subtitle: "District · Warsaw",
    lat: 52.193,
    lng: 21.03,
  },
  {
    id: "addr-ochota",
    label: "Ochota",
    subtitle: "District · Warsaw",
    lat: 52.212,
    lng: 20.98,
  },
  {
    id: "addr-praga",
    label: "Praga-Północ",
    subtitle: "District · Warsaw",
    lat: 52.255,
    lng: 21.035,
  },
  {
    id: "addr-zoliborz",
    label: "Żoliborz",
    subtitle: "District · Warsaw",
    lat: 52.268,
    lng: 20.99,
  },
  {
    id: "addr-hoza",
    label: "ul. Hoża",
    subtitle: "Street · Warsaw",
    lat: 52.2265,
    lng: 21.0128,
  },
  {
    id: "addr-koszykowa",
    label: "ul. Koszykowa",
    subtitle: "Street · Warsaw",
    lat: 52.2228,
    lng: 21.0115,
  },
  {
    id: "addr-marszalkowska",
    label: "ul. Marszałkowska",
    subtitle: "Street · Warsaw",
    lat: 52.229,
    lng: 21.012,
  },
  {
    id: "addr-nowy-swiat",
    label: "ul. Nowy Świat",
    subtitle: "Street · Warsaw",
    lat: 52.2355,
    lng: 21.0195,
  },
  {
    id: "addr-saska",
    label: "Saska Kępa",
    subtitle: "Neighborhood · Warsaw",
    lat: 52.233,
    lng: 21.06,
  },
  {
    id: "addr-wilanow",
    label: "Wilanów",
    subtitle: "District · Warsaw",
    lat: 52.165,
    lng: 21.09,
  },
  {
    id: "addr-ursynow",
    label: "Ursynów",
    subtitle: "District · Warsaw",
    lat: 52.145,
    lng: 21.035,
  },
];

export function searchWarsawAddresses(query: string, limit = 6): WarsawAddress[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return WARSAW_ADDRESSES.filter((item) =>
    `${item.label} ${item.subtitle}`.toLowerCase().includes(needle),
  ).slice(0, limit);
}
