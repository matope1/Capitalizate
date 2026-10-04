import { COUNTRY_BY_NUMERIC_MAP_ID } from "@/lib/countries";
import type { Country } from "@/types/game";

export interface MapCountryState {
  country?: Country;
  isCurrent: boolean;
  isComplete: boolean;
  hasFailed: boolean;
}

export function getMapCountryState(
  numericId: string,
  currentCountryId: string | undefined,
  completedIds: ReadonlySet<string>,
  failedIds: ReadonlySet<string>,
): MapCountryState {
  const country = COUNTRY_BY_NUMERIC_MAP_ID.get(numericId.padStart(3, "0"));
  const isCurrent = Boolean(country && country.id === currentCountryId);
  const isComplete = country ? completedIds.has(country.id) : false;
  const hasFailed = country ? failedIds.has(country.id) && !isComplete : false;
  return { country, isCurrent, isComplete, hasFailed };
}
