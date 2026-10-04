import type { AnswerChoice, ContinentFilter, ContinentProgress, Country, GameMode, Question, QuestionDirection } from "@/types/game";

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function filterCountries(countries: Country[], continent: ContinentFilter): Country[] {
  return continent === "Mundo" ? countries : countries.filter((country) => country.continent === continent);
}

export function searchCountries(countries: Country[], query: string): Country[] {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return countries;
  return countries.filter((country) => normalizeText(country.name).includes(normalizedQuery));
}

export function searchCapitals(countries: Country[], query: string): Array<{ country: Country; capital: string }> {
  const normalizedQuery = normalizeText(query);
  const options = countries.flatMap((country) =>
    [country.capital, ...country.capitalAliases].map((capital) => ({ country, capital })),
  );
  return normalizedQuery
    ? options.filter(({ capital }) => normalizeText(capital).includes(normalizedQuery))
    : options;
}

export function createQuestionOrder(
  countries: Country[],
  mode: GameMode,
  random: () => number = Math.random,
): Question[] {
  const shuffled = [...countries];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.map((country) => ({
    countryId: country.id,
    direction:
      mode === "random"
        ? random() < 0.5
          ? "country-capital"
          : "capital-country"
        : (mode as QuestionDirection),
  }));
}

export function isCorrectAnswer(question: Question, country: Country, choice: Pick<AnswerChoice, "countryId" | "value">): boolean {
  if (question.countryId !== country.id || choice.countryId !== country.id) return false;
  if (question.direction === "capital-country") return true;
  const accepted = [country.capital, ...country.capitalAliases].map(normalizeText);
  return accepted.includes(normalizeText(choice.value));
}

export function getProgress(countries: Country[], completedIds: ReadonlySet<string>) {
  const byContinent = new Map<Country["continent"], ContinentProgress>();
  for (const country of countries) {
    const count = byContinent.get(country.continent) ?? { continent: country.continent, completed: 0, total: 0 };
    count.total += 1;
    if (completedIds.has(country.id)) count.completed += 1;
    byContinent.set(country.continent, count);
  }
  const completed = countries.filter((country) => completedIds.has(country.id)).length;
  return {
    completed,
    total: countries.length,
    percent: countries.length ? Math.round((completed / countries.length) * 100) : 0,
    byContinent: [...byContinent.values()],
  };
}
