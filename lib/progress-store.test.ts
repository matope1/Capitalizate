import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS, loadProgress, saveProgress, STORAGE_KEY } from "@/lib/progress-store";
import type { SavedProgress } from "@/types/game";

function makeStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("persistencia local del progreso", () => {
  it("guarda y recupera estados de países y estadísticas", () => {
    const storage = makeStorage();
    const progress: SavedProgress = { version: 1, completedIds: ["FRA"], failedIds: ["ESP"], correctAnswers: 1, errors: 2 };
    saveProgress(storage, progress);
    expect(storage.getItem(STORAGE_KEY)).toBe(JSON.stringify(progress));
    expect(loadProgress(storage)).toEqual(progress);
  });

  it("ignora datos incompletos o corruptos sin interrumpir la partida", () => {
    const storage = makeStorage();
    storage.setItem(STORAGE_KEY, "not-json");
    expect(loadProgress(storage)).toEqual(EMPTY_PROGRESS);
  });

  it("recupera solamente identificadores de texto y contadores válidos", () => {
    const storage = makeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completedIds: ["FRA", 5], failedIds: null, correctAnswers: "bad", errors: -2 }));
    expect(loadProgress(storage)).toEqual({ version: 1, completedIds: ["FRA"], failedIds: [], correctAnswers: 0, errors: 0 });
  });
});
