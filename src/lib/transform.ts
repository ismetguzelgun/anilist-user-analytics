import type { DashboardFilters, DerivedAnimeEntry, AnimeListEntry } from "./types";

function getYear(date: { year: number | null } | null | undefined): number | null {
  return date?.year ?? null;
}

function inferReleaseYear(entry: AnimeListEntry): number | null {
  return getYear(entry.media.startDate) ?? entry.media.seasonYear ?? null;
}

function extractOriginalCreators(entry: AnimeListEntry): string[] {
  const creators = entry.media.staff.edges
    .filter((edge) => edge.role?.toLowerCase().includes("original creator"))
    .map((edge) => edge.node.name.full)
    .filter((name): name is string => Boolean(name));

  return [...new Set(creators)];
}

export function deriveEntries(entries: AnimeListEntry[]): DerivedAnimeEntry[] {
  return entries.map((entry) => {
    const releaseYear = inferReleaseYear(entry);
    const completedYear = getYear(entry.completedAt);
    const startedYear = getYear(entry.startedAt);
    const studios = entry.media.studios.nodes.map((studio) => studio.name);
    const genres = entry.media.genres ?? [];
    const originalCreators = extractOriginalCreators(entry);
    return {
      mediaId: entry.media.id,
      malId: entry.media.idMal,
      title: entry.media.title.userPreferred || entry.media.title.romaji || "Untitled",
      score: entry.score,
      status: entry.status,
      progress: entry.progress,
      format: entry.media.format ?? "UNKNOWN",
      genres,
      originalCreators,
      studios,
      episodes: entry.media.episodes,
      releaseYear,
      completedYear,
      startedYear,
      lagYears:
        releaseYear !== null && completedYear !== null
          ? completedYear - releaseYear
          : null,
    };
  });
}

export function getYearBounds(
  entries: DerivedAnimeEntry[],
  pick: (entry: DerivedAnimeEntry) => number | null,
): { min: number; max: number } | null {
  const years = entries.map(pick).filter((year): year is number => year !== null);
  if (years.length === 0) {
    return null;
  }
  return { min: Math.min(...years), max: Math.max(...years) };
}

export function getFormats(entries: DerivedAnimeEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.format))].sort();
}

export function getStatuses(entries: DerivedAnimeEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.status))].sort();
}

export function applyFilters(
  entries: DerivedAnimeEntry[],
  filters: DashboardFilters,
): DerivedAnimeEntry[] {
  return entries.filter((entry) => {
    if (filters.status !== "ALL" && entry.status !== filters.status) {
      return false;
    }
    if (filters.format !== "ALL" && entry.format !== filters.format) {
      return false;
    }
    if (entry.score < filters.minScore) {
      return false;
    }
    if (
      filters.releaseYearMin !== null &&
      (entry.releaseYear === null || entry.releaseYear < filters.releaseYearMin)
    ) {
      return false;
    }
    if (
      filters.releaseYearMax !== null &&
      (entry.releaseYear === null || entry.releaseYear > filters.releaseYearMax)
    ) {
      return false;
    }
    if (
      filters.completedYearMin !== null &&
      (entry.completedYear === null || entry.completedYear < filters.completedYearMin)
    ) {
      return false;
    }
    if (
      filters.completedYearMax !== null &&
      (entry.completedYear === null || entry.completedYear > filters.completedYearMax)
    ) {
      return false;
    }
    return true;
  });
}

export function countByYear(
  entries: DerivedAnimeEntry[],
  pick: (entry: DerivedAnimeEntry) => number | null,
): Array<[number, number]> {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    const year = pick(entry);
    if (year === null) {
      continue;
    }
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]);
}

export function averageScore(entries: DerivedAnimeEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }
  const total = entries.reduce((sum, entry) => sum + entry.score, 0);
  return total / entries.length;
}

export function medianLag(entries: DerivedAnimeEntry[]): number | null {
  const values = entries
    .map((entry) => entry.lagYears)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (values.length === 0) {
    return null;
  }
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return (values[mid - 1] + values[mid]) / 2;
  }
  return values[mid];
}

export function buildHeatmap(
  entries: DerivedAnimeEntry[],
): {
  releaseYears: number[];
  completedYears: number[];
  values: Array<[number, number, number]>;
} {
  const releaseYears = [
    ...new Set(entries.map((entry) => entry.releaseYear).filter((year): year is number => year !== null)),
  ].sort((a, b) => a - b);
  const completedYears = [
    ...new Set(entries.map((entry) => entry.completedYear).filter((year): year is number => year !== null)),
  ].sort((a, b) => a - b);

  const releaseIndex = new Map(releaseYears.map((year, index) => [year, index]));
  const completedIndex = new Map(completedYears.map((year, index) => [year, index]));
  const matrix = new Map<string, number>();

  for (const entry of entries) {
    if (entry.releaseYear === null || entry.completedYear === null) {
      continue;
    }
    const x = releaseIndex.get(entry.releaseYear);
    const y = completedIndex.get(entry.completedYear);
    if (x === undefined || y === undefined) {
      continue;
    }
    const key = `${x}:${y}`;
    matrix.set(key, (matrix.get(key) ?? 0) + 1);
  }

  const values = [...matrix.entries()].map(([key, count]) => {
    const [x, y] = key.split(":").map(Number);
    return [x, y, count] as [number, number, number];
  });

  return { releaseYears, completedYears, values };
}

export function buildLagHistogram(entries: DerivedAnimeEntry[]): Array<[number, number]> {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    if (entry.lagYears === null) {
      continue;
    }
    counts.set(entry.lagYears, (counts.get(entry.lagYears) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]);
}

export function countByStudio(
  entries: DerivedAnimeEntry[],
  options?: { minScore?: number; limit?: number },
): Array<[string, number]> {
  const minScore = options?.minScore ?? 8;
  const limit = options?.limit ?? 15;
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.score < minScore) {
      continue;
    }
    for (const studio of entry.studios) {
      counts.set(studio, (counts.get(studio) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit);
}

export function countByGenre(
  entries: DerivedAnimeEntry[],
  options?: { limit?: number },
): Array<[string, number]> {
  const limit = options?.limit ?? 15;
  const counts = new Map<string, number>();

  for (const entry of entries) {
    for (const genre of entry.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit);
}

export function countByOriginalCreator(
  entries: DerivedAnimeEntry[],
  options?: { limit?: number },
): Array<[string, number]> {
  const limit = options?.limit ?? 15;
  const counts = new Map<string, number>();

  for (const entry of entries) {
    for (const creator of entry.originalCreators) {
      counts.set(creator, (counts.get(creator) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit);
}
