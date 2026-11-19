export const bsak = {
  name: "BSAK",
  fullName: "Brazilian Series of Amateur Karting",
  fullNamePt: "Série Brasileira de Kart Amador",
  tagline: "R$ 700 mil em prêmios",
  guaranteed: "700K GARANTIDO",
  entryFeeReais: 250,
  banner: "/brand/bsak-banner.jpg",
  href: "/torneios/bsak",
  finals: {
    dates: "9 / 10 / 11 JUL",
    stage: "Rio de Janeiro",
    slots: 60,
  },
  classificatorias: [
    { dates: "5 / 6 / 7 ABR", stage: "Amazonas", slots: 2, entries: 70, share: 0.023 },
    { dates: "12 / 13 / 14 ABR", stage: "Mato Grosso", slots: 2, entries: 90, share: 0.03 },
    { dates: "19 / 20 / 21 ABR", stage: "Pernambuco", slots: 2, entries: 140, share: 0.047 },
    { dates: "26 / 27 / 28 ABR", stage: "Bahia", slots: 2, entries: 190, share: 0.063 },
    { dates: "3 / 4 / 5 MAI", stage: "Santa Catarina", slots: 2, entries: 210, share: 0.07 },
    { dates: "10 / 11 / 12 MAI", stage: "Rio Grande do Sul", slots: 2, entries: 260, share: 0.087 },
    { dates: "17 / 18 / 19 MAI", stage: "Paraná", slots: 3, entries: 280, share: 0.093 },
    { dates: "24 / 25 / 26 MAI", stage: "Minas Gerais", slots: 5, entries: 420, share: 0.14 },
    { dates: "17 / 18 / 19 / 20 JUN", stage: "São Paulo", slots: 30, entries: 900, share: 0.3 },
    { dates: "21 a 27 JUN", stage: "Rio de Janeiro", slots: 10, entries: 440, share: 0.147 },
  ],
  finalsPrizes: [
    { place: "1º", amount: 180_000 },
    { place: "2º", amount: 75_000 },
    { place: "3º", amount: 50_000 },
    { place: "4º", amount: 35_000 },
    { place: "5º", amount: 25_000 },
    { place: "6º", amount: 20_000 },
    { place: "7º", amount: 15_000 },
    { place: "8º", amount: 12_000 },
    { place: "9º", amount: 10_000 },
    { place: "10º", amount: 8_000 },
    { place: "11º ao 15º", amount: 5_000 },
    { place: "16º ao 20º", amount: 4_000 },
    { place: "21º ao 25º", amount: 3_000 },
    { place: "26º ao 30º", amount: 2_000 },
    { place: "31º ao 60º", amount: 0 },
  ],
  qualifierPrizes: [
    {
      stage: "SP",
      total: 60_000,
      places: [27_000, 15_000, 9_000, 5_400, 3_600],
    },
    {
      stage: "RJ",
      total: 30_000,
      places: [13_500, 7_500, 4_500, 2_700, 1_800],
    },
    {
      stage: "MG",
      total: 28_000,
      places: [12_600, 7_000, 4_200, 2_520, 1_680],
    },
    {
      stage: "PR",
      total: 18_000,
      places: [8_100, 4_500, 2_700, 1_620, 1_080],
    },
    {
      stage: "RS",
      total: 18_000,
      places: [8_100, 4_500, 2_700, 1_620, 1_080],
    },
    {
      stage: "SC",
      total: 14_000,
      places: [6_300, 3_500, 2_100, 1_260, 840],
    },
    {
      stage: "BA",
      total: 12_000,
      places: [5_400, 3_000, 1_800, 1_080, 720],
    },
    {
      stage: "PE",
      total: 10_000,
      places: [4_500, 2_500, 1_500, 900, 600],
    },
    {
      stage: "MT",
      total: 6_000,
      places: [2_700, 1_500, 900, 540, 360],
    },
    {
      stage: "AM",
      total: 4_000,
      places: [1_800, 1_000, 600, 360, 240],
    },
  ],
  qualifierPrizePool: 200_000,
} as const;

export function formatBRL(reais: number) {
  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
