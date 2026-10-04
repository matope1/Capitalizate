import { describe, expect, it } from "vitest";
import { COUNTRIES, COUNTRY_BY_ID } from "@/lib/countries";
import { createQuestionOrder, filterCountries, getProgress, isCorrectAnswer, normalizeText, searchCapitals, searchCountries } from "@/lib/game";
import { getMapCountryState } from "@/lib/map-state";
import type { Question } from "@/types/game";

describe("catálogo mundial", () => {
  it("incluye 195 países completos con identificadores únicos y geometría asociada", () => {
    expect(COUNTRIES).toHaveLength(195);
    expect(new Set(COUNTRIES.map((country) => country.id)).size).toBe(195);
    expect(new Set(COUNTRIES.map((country) => country.iso2)).size).toBe(195);
    for (const country of COUNTRIES) {
      expect(country.name, country.id).toBeTruthy();
      expect(country.capital, country.id).toBeTruthy();
      expect(country.continent, country.id).toBeTruthy();
      expect(country.mapId, country.id).toBe(country.iso3);
      expect(country.mapNumericId, country.id).toMatch(/^\d{3}$/);
      expect(country.coordinates, country.id).toHaveLength(2);
    }
  });

  it("usa los totales continentales documentados y filtro determinista", () => {
    expect(filterCountries(COUNTRIES, "Mundo")).toHaveLength(195);
    expect(searchCountries(COUNTRIES, "")).toHaveLength(195);
    expect(filterCountries(COUNTRIES, "Europa")).toHaveLength(44);
    expect(filterCountries(COUNTRIES, "Asia")).toHaveLength(48);
    expect(filterCountries(COUNTRIES, "África")).toHaveLength(54);
    expect(filterCountries(COUNTRIES, "América")).toHaveLength(35);
    expect(filterCountries(COUNTRIES, "Oceanía")).toHaveLength(14);
  });

  it("representa con punto el único país sin polígono en la escala seleccionada", () => {
    expect(COUNTRIES.filter((country) => country.mapPointFallback).map((country) => country.iso3)).toEqual(["TUV"]);
    expect(COUNTRY_BY_ID.get("VAT")?.mapNumericId).toBe("336");
    expect(COUNTRY_BY_ID.get("PSE")?.mapNumericId).toBe("275");
    expect(COUNTRY_BY_ID.get("FRA")?.mapNumericId).toBe("250");
  });

  it("usa nombres españoles reconocibles para países y capitales", () => {
    expect(COUNTRY_BY_ID.get("COD")?.name).toBe("República Democrática del Congo");
    expect(COUNTRY_BY_ID.get("FRA")?.capital).toBe("París");
    expect(COUNTRY_BY_ID.get("ARE")?.capital).toBe("Abu Dabi");
    expect(COUNTRY_BY_ID.get("GRC")?.capital).toBe("Atenas");
    expect(COUNTRY_BY_ID.get("DEU")?.capital).toBe("Berlín");
  });

  it("resalta Francia usando el identificador cartográfico de Natural Earth", () => {
    const state = getMapCountryState("250", "FRA", new Set(), new Set());
    expect(state.country?.name).toBe("Francia");
    expect(state.isCurrent).toBe(true);
    expect(state.isComplete).toBe(false);
  });

  it("asocia Timor-Leste con su geometría y valida su selección en el mapa", () => {
    const timorLeste = COUNTRY_BY_ID.get("TLS")!;
    const state = getMapCountryState("626", "TLS", new Set(), new Set());
    const question: Question = { countryId: "TLS", direction: "capital-country" };

    expect(state.country?.id).toBe("TLS");
    expect(state.isCurrent).toBe(true);
    expect(isCorrectAnswer(question, timorLeste, { countryId: "TLS", value: "TLS" })).toBe(true);
  });

  it("no marca Groenlandia ni la Antártida como país actual si no tienen país asociado", () => {
    const greenland = getMapCountryState("304", undefined, new Set(), new Set());
    const antarctica = getMapCountryState("010", undefined, new Set(), new Set());

    expect(greenland.country).toBeUndefined();
    expect(greenland.isCurrent).toBe(false);
    expect(antarctica.country).toBeUndefined();
    expect(antarctica.isCurrent).toBe(false);
  });
});

describe("búsqueda y respuestas", () => {
  it("busca países y capitales sin distinguir mayúsculas ni tildes", () => {
    expect(searchCountries(COUNTRIES, "ESPANA").map((country) => country.iso3)).toContain("ESP");
    expect(searchCountries(COUNTRIES, "francia").map((country) => country.iso3)).toContain("FRA");
    expect(searchCapitals(COUNTRIES, "paris").map((option) => option.country.iso3)).toContain("FRA");
    expect(normalizeText("  París ")).toBe("paris");
  });

  it("acepta París para Francia, también sin tilde, y no para otro país", () => {
    const france = COUNTRY_BY_ID.get("FRA")!;
    const question: Question = { countryId: "FRA", direction: "country-capital" };
    expect(isCorrectAnswer(question, france, { countryId: "FRA", value: "París" })).toBe(true);
    expect(isCorrectAnswer(question, france, { countryId: "FRA", value: "PARIS" })).toBe(true);
    expect(isCorrectAnswer(question, france, { countryId: "DEU", value: "París" })).toBe(false);
    expect(isCorrectAnswer(question, france, { countryId: "FRA", value: "Lyon" })).toBe(false);
  });

  it("acepta las capitales alternativas documentadas, pero evita capitales de otro país", () => {
    const bolivia = COUNTRY_BY_ID.get("BOL")!;
    const question: Question = { countryId: "BOL", direction: "country-capital" };
    expect(isCorrectAnswer(question, bolivia, { countryId: "BOL", value: "La Paz" })).toBe(true);
    expect(isCorrectAnswer(question, bolivia, { countryId: "PER", value: "La Paz" })).toBe(false);
  });

  it("corrige el modo Capital → país por ISO del país elegido", () => {
    const france = COUNTRY_BY_ID.get("FRA")!;
    const question: Question = { countryId: "FRA", direction: "capital-country" };
    expect(isCorrectAnswer(question, france, { countryId: "FRA", value: "FRA" })).toBe(true);
    expect(isCorrectAnswer(question, france, { countryId: "ESP", value: "ESP" })).toBe(false);
  });
});

describe("rondas y progreso", () => {
  const twoCountries = COUNTRIES.filter((country) => ["FRA", "ESP"].includes(country.iso3));

  it("crea una pregunta por país en ambas direcciones", () => {
    expect(createQuestionOrder(twoCountries, "country-capital", () => 0.4).every((question) => question.direction === "country-capital")).toBe(true);
    expect(createQuestionOrder(twoCountries, "capital-country", () => 0.4).every((question) => question.direction === "capital-country")).toBe(true);
  });

  it("mezcla ambas direcciones en modo aleatorio", () => {
    let step = 0;
    const deterministic = () => ((step++ % 4) < 2 ? 0.1 : 0.9);
    const order = createQuestionOrder(twoCountries, "random", deterministic);
    expect(order).toHaveLength(2);
    expect(new Set(order.map((question) => question.direction))).toEqual(new Set(["country-capital", "capital-country"]));
  });

  it("calcula progreso global y por continente desde el catálogo", () => {
    const result = getProgress(COUNTRIES, new Set(["FRA", "ESP"]));
    expect(result.total).toBe(195);
    expect(result.completed).toBe(2);
    expect(result.percent).toBe(1);
    expect(result.byContinent.find((item) => item.continent === "Europa")).toMatchObject({ completed: 2, total: 44 });
  });
});
