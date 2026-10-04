import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sourceCountries = require("world-countries/countries.json");
const topology = require("world-atlas/countries-50m.json");
const mapIds = new Set(topology.objects.countries.geometries.map((item) => String(item.id).padStart(3, "0")));

const specialCapitals = {
  PSE: {
    capital: "Jerusalén Este",
    capitalAliases: ["Ramala"],
    capitalNote: "Se usa Jerusalén Este como capital reclamada; Ramala es la sede administrativa de la Autoridad Palestina.",
  },
  BOL: { capitalAliases: ["La Paz"], capitalNote: "Sucre es la capital constitucional; La Paz es la sede del Gobierno." },
  ZAF: { capitalAliases: ["Ciudad del Cabo", "Bloemfontein"], capitalNote: "Pretoria es la capital ejecutiva; Ciudad del Cabo es legislativa y Bloemfontein judicial." },
  BEN: { capitalAliases: ["Cotonú"], capitalNote: "Porto Novo es la capital oficial; Cotonú alberga la sede del Gobierno." },
  CIV: { capitalAliases: ["Abiyán"], capitalNote: "Yamusukro es la capital oficial; Abiyán continúa siendo la principal sede administrativa y económica." },
  LKA: { capitalAliases: ["Colombo"], capitalNote: "Sri Jayawardenepura Kotte es la capital legislativa; Colombo concentra varias funciones administrativas." },
  MYS: { capitalAliases: ["Putrajaya"], capitalNote: "Kuala Lumpur es la capital; Putrajaya alberga la sede administrativa federal." },
  NLD: { capitalNote: "Ámsterdam es la capital constitucional; La Haya es la sede del Gobierno y no se ofrece como respuesta alternativa." },
  TZA: { capitalAliases: ["Dar es Salaam"], capitalNote: "Dodoma es la capital; Dar es Salaam mantiene funciones administrativas y diplomáticas." },
};

const spanishCountryNames = {
  BHR: "Baréin", BWA: "Botsuana", BRN: "Brunéi", COD: "República Democrática del Congo",
  COG: "República del Congo", DJI: "Yibuti", GRD: "Granada", IRN: "Irán", KGZ: "Kirguistán",
  LSO: "Lesoto", MWI: "Malaui", MLI: "Malí", ROU: "Rumanía", SLE: "Sierra Leona",
  SWZ: "Esuatini", TLS: "Timor-Leste",
};

const spanishCapitals = {
  "Abu Dhabi": "Abu Dabi", Abuja: "Abuya", "Addis Ababa": "Adís Abeba", Abidjan: "Abiyán", Algiers: "Argel", Amman: "Amán",
  Amsterdam: "Ámsterdam", Ashgabat: "Asjabad", Astana: "Astaná", Athens: "Atenas", Baghdad: "Bagdad", Baku: "Bakú",
  Beijing: "Pekín", Belgrade: "Belgrado", Berlin: "Berlín", Bern: "Berna", Bishkek: "Biskek", Bissau: "Bisáu",
  Brasilia: "Brasilia", Brasília: "Brasilia", Brussels: "Bruselas", Bucharest: "Bucarest", Cairo: "El Cairo",
  "City of San Marino": "San Marino", "Copenhagen": "Copenhague", "Conakry": "Conakri", Damascus: "Damasco", Dhaka: "Daca", Dushanbe: "Dusambé",
  "Guatemala City": "Ciudad de Guatemala", Hanoi: "Hanói", Havana: "La Habana", Jakarta: "Yakarta", Jerusalem: "Jerusalén",
  Kathmandu: "Katmandú", Khartoum: "Jartum", "Kuwait City": "Ciudad de Kuwait", Kyiv: "Kyiv", Lisbon: "Lisboa",
  Ljubljana: "Liubliana", London: "Londres", "Malé": "Malé", "Mexico City": "Ciudad de México", Mogadishu: "Mogadiscio",
  Moscow: "Moscú", Muscat: "Mascate", "N'Djamena": "Yamena", Naypyidaw: "Naipyidó", "New Delhi": "Nueva Delhi",
  Ngerulmud: "Ngerulmud", "Nuku'alofa": "Nukualofa", "Ouagadougou": "Uagadugú", "Panama City": "Ciudad de Panamá",
  Paris: "París", "Phnom Penh": "Nom Pen", "Port of Spain": "Puerto España", "Port-au-Prince": "Puerto Príncipe",
  "Porto-Novo": "Porto Novo", Prague: "Praga", Pyongyang: "Pionyang", Reykjavik: "Reikiavik", Riyadh: "Riad", Rome: "Roma",
  "Sana'a": "Saná", "São Tomé": "Santo Tomé", Seoul: "Seúl", Singapore: "Singapur", Skopje: "Skopie", Sofia: "Sofía", "South Tarawa": "Tarawa del Sur",
  "St. George's": "Saint George's", Stockholm: "Estocolmo", Tallinn: "Tallin", Tashkent: "Taskent", Tbilisi: "Tiflis",
  Tehran: "Teherán", Thimphu: "Timbu", Tokyo: "Tokio", Tunis: "Túnez", "Ulan Bator": "Ulán Bator", Valletta: "La Valeta",
  "Vatican City": "Ciudad del Vaticano", Vienna: "Viena", Vientiane: "Vientián", Warsaw: "Varsovia", "Washington D.C.": "Washington D. C.",
  "Chișinău": "Chisináu", "Djibouti": "Yibuti", "Dublin": "Dublín", "Cape Town": "Ciudad del Cabo", "Bloemfontein": "Bloemfontein",
  "Luxembourg": "Luxemburgo", "Monaco": "Mónaco", "Nouakchott": "Nuakchot", "Port Louis": "Puerto Luis", "Tripoli": "Trípoli", "Vilnius": "Vilna",
  Yamoussoukro: "Yamusukro", Yaoundé: "Yaundé", Yerevan: "Ereván",
};

function translateCapital(capital) {
  return spanishCapitals[capital] ?? capital;
}

const included = sourceCountries.filter((country) => country.unMember || country.cca3 === "PSE" || country.cca3 === "VAT");
const countries = included.map((country) => {
  const id = country.cca3;
  const override = specialCapitals[id] ?? {};
  const sourceCapital = country.capital?.[0];
  const allCapitals = country.capital ?? [];
  const primaryCapital = override.capital ?? translateCapital(sourceCapital);
  const generatedAliases = allCapitals.slice(1).map(translateCapital);
  const capitalAliases = [...new Set([...(override.capitalAliases ?? []), ...generatedAliases])].filter((capital) => capital !== primaryCapital);
  const rawContinent = country.region;
  const continent = id === "RUS"
    ? "Asia"
    : ({ Africa: "África", Americas: "América", Asia: "Asia", Europe: "Europa", Oceania: "Oceanía" })[rawContinent];
  const coordinates = country.latlng ?? [0, 0];

  if (!country.translations?.spa?.common || !primaryCapital || !continent) {
    throw new Error(`Faltan datos obligatorios para ${id}`);
  }

  return {
    id,
    name: spanishCountryNames[id] ?? country.translations.spa.common,
    nameEn: country.name.common,
    capital: primaryCapital,
    capitalAliases,
    ...(override.capitalNote ? { capitalNote: override.capitalNote } : {}),
    continent,
    iso2: country.cca2,
    iso3: id,
    mapId: id,
    mapNumericId: country.ccn3,
    coordinates: [coordinates[1], coordinates[0]],
    ...(mapIds.has(country.ccn3) ? {} : { mapPointFallback: true }),
  };
});

if (countries.length !== 195) throw new Error(`Se esperaban 195 países y hay ${countries.length}`);
const seenIds = new Set();
const seenNames = new Set();
const seenCapitals = new Set();
for (const country of countries) {
  if (seenIds.has(country.id)) throw new Error(`Código ISO duplicado: ${country.id}`);
  seenIds.add(country.id);
  const nameKey = country.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const capitalKey = country.capital.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (seenNames.has(nameKey)) throw new Error(`Nombre de país duplicado: ${country.name}`);
  if (seenCapitals.has(capitalKey)) throw new Error(`Capital principal duplicada: ${country.capital}`);
  seenNames.add(nameKey);
  seenCapitals.add(capitalKey);
}

const continentCounts = countries.reduce((counts, country) => {
  counts[country.continent] = (counts[country.continent] ?? 0) + 1;
  return counts;
}, {});
const expected = { "África": 54, "América": 35, Asia: 48, "Europa": 44, "Oceanía": 14 };
if (JSON.stringify(Object.fromEntries(Object.entries(continentCounts).sort())) !== JSON.stringify(Object.fromEntries(Object.entries(expected).sort()))) {
  throw new Error(`Distribución continental inesperada: ${JSON.stringify(continentCounts)}`);
}

const missingShapes = countries.filter((country) => country.mapPointFallback);
if (missingShapes.some((country) => country.id !== "TUV")) {
  throw new Error(`Países sin geometría no documentados: ${missingShapes.map((country) => country.id).join(", ")}`);
}
const coveredIds = new Set(topology.objects.countries.geometries.map((item) => String(item.id).padStart(3, "0")));
const missingCountries = countries.filter((country) => !coveredIds.has(country.mapNumericId) && !country.mapPointFallback);
if (missingCountries.length) throw new Error(`Países sin mapa: ${missingCountries.map((country) => country.id).join(", ")}`);

const output = `${JSON.stringify(countries, null, 2)}\n`;
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/countries.json", import.meta.url), output);
const map = await readFile(require.resolve("world-atlas/countries-50m.json"));
await writeFile(new URL("../public/countries-50m.json", import.meta.url), map);
console.log(`Generados ${countries.length} países; continentes ${JSON.stringify(continentCounts)}; geometría con punto alternativo: ${missingShapes.map((country) => country.id).join(", ")}`);
