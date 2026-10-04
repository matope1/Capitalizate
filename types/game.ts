export const CONTINENTS = ["Europa", "Asia", "África", "América", "Oceanía"] as const;

export type Continent = (typeof CONTINENTS)[number];
export type ContinentFilter = Continent | "Mundo";
export type GameMode = "country-capital" | "capital-country" | "random" | "country-capital-map";
export type QuestionDirection = "country-capital" | "capital-country" | "country-capital-map";
export type CountryStatus = "new" | "failed" | "completed";

export interface Country {
  id: string;
  name: string;
  nameEn: string;
  capital: string;
  capitalAliases: string[];
  capitalNote?: string;
  continent: Continent;
  iso2: string;
  iso3: string;
  mapId: string;
  mapNumericId: string;
  coordinates: [number, number];
  mapPointFallback?: boolean;
}

export interface Question {
  countryId: string;
  direction: QuestionDirection;
}

export interface AnswerChoice {
  id: string;
  countryId: string;
  value: string;
  label: string;
  detail?: string;
}

export interface SavedProgress {
  version: 1;
  completedIds: string[];
  failedIds: string[];
  correctAnswers: number;
  errors: number;
}

export interface ContinentProgress {
  continent: Continent;
  completed: number;
  total: number;
}
