import type { SavedProgress } from "@/types/game";

export const STORAGE_KEY = "capitalizate-progress-v1";

export const EMPTY_PROGRESS: SavedProgress = {
  version: 1,
  completedIds: [],
  failedIds: [],
  correctAnswers: 0,
  errors: 0,
};

export function loadProgress(storage: Pick<Storage, "getItem">): SavedProgress {
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object" || (value as SavedProgress).version !== 1) return EMPTY_PROGRESS;
    const saved = value as Partial<SavedProgress>;
    return {
      version: 1,
      completedIds: Array.isArray(saved.completedIds) ? saved.completedIds.filter((id): id is string => typeof id === "string") : [],
      failedIds: Array.isArray(saved.failedIds) ? saved.failedIds.filter((id): id is string => typeof id === "string") : [],
      correctAnswers: Number.isFinite(saved.correctAnswers) ? Math.max(0, saved.correctAnswers as number) : 0,
      errors: Number.isFinite(saved.errors) ? Math.max(0, saved.errors as number) : 0,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(storage: Pick<Storage, "setItem">, progress: SavedProgress): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private browsing and storage quota restrictions should not stop a game.
  }
}
