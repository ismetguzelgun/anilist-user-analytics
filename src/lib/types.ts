export type FuzzyDate = {
  year: number | null;
  month: number | null;
  day: number | null;
};

export type MediaTitle = {
  userPreferred: string;
  romaji: string | null;
};

export type StudioNode = {
  name: string;
};

export type StaffEdge = {
  role: string | null;
  node: {
    name: {
      full: string;
    };
  };
};

export type NextAiringEpisode = {
  episode: number | null;
  airingAt: number | null;
  timeUntilAiring: number | null;
};

export type AnimeMedia = {
  id: number;
  idMal: number | null;
  episodes: number | null;
  format: string | null;
  seasonYear: number | null;
  genres: string[];
  nextAiringEpisode: NextAiringEpisode | null;
  staff: {
    edges: StaffEdge[];
  };
  studios: {
    nodes: StudioNode[];
  };
  startDate: FuzzyDate;
  title: MediaTitle;
};

export type AnimeListEntry = {
  status: string;
  score: number;
  progress: number;
  startedAt: FuzzyDate;
  completedAt: FuzzyDate;
  media: AnimeMedia;
};

export type AniListCollectionResponse = {
  MediaListCollection: {
    lists: Array<{
      name: string;
      isCustomList: boolean;
      entries: AnimeListEntry[];
    }>;
  } | null;
};

export type DerivedAnimeEntry = {
  mediaId: number;
  malId: number | null;
  title: string;
  score: number;
  status: string;
  progress: number;
  format: string;
  genres: string[];
  originalCreators: string[];
  studios: string[];
  episodes: number | null;
  nextAiringEpisode: NextAiringEpisode | null;
  releaseYear: number | null;
  completedYear: number | null;
  startedYear: number | null;
  lagYears: number | null;
};

export type DashboardFilters = {
  status: string;
  minScore: number;
  format: string;
  releaseYearMin: number | null;
  releaseYearMax: number | null;
  completedYearMin: number | null;
  completedYearMax: number | null;
};
