import countriesData from "@/data/countries.json";
import type { Country } from "@/types/game";

export const COUNTRIES = countriesData as Country[];
export const COUNTRY_BY_ID = new Map(COUNTRIES.map((country) => [country.id, country]));
export const COUNTRY_BY_NUMERIC_MAP_ID = new Map(COUNTRIES.map((country) => [country.mapNumericId, country]));
