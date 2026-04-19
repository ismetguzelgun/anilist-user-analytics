import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Container,
  Group,
  Pagination,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  TextInput,
  Text,
  Title,
} from "@mantine/core";
import { fetchAnimeCollection } from "./api/anilist";
import { FiltersPanel } from "./components/FiltersPanel";
import { StatsGrid } from "./components/StatsGrid";
import { HeatmapChart } from "./components/charts/HeatmapChart";
import { LagHistogramChart } from "./components/charts/LagHistogramChart";
import { GenreBarChart } from "./components/charts/GenreBarChart";
import { OriginalCreatorBarChart } from "./components/charts/OriginalCreatorBarChart";
import { StudioBarChart } from "./components/charts/StudioBarChart";
import { YearBarChart } from "./components/charts/YearBarChart";
import {
  applyFilters,
  averageScore,
  buildHeatmap,
  buildLagHistogram,
  countByGenre,
  countByOriginalCreator,
  countByYear,
  countByStudio,
  deriveEntries,
  getCurrentlyAiring,
  getFormats,
  getStatuses,
  medianLag,
} from "./lib/transform";
import type { DashboardFilters, DerivedAnimeEntry } from "./lib/types";

const EXAMPLE_USER = "kneestronk";

const initialFilters: DashboardFilters = {
  status: "COMPLETED",
  minScore: 0,
  format: "ALL",
  releaseYearMin: null,
  releaseYearMax: null,
  completedYearMin: null,
  completedYearMax: null,
};

const chartOptions = [
  { key: "heatmap", label: "Heatmap" },
  { key: "releaseYear", label: "By Release Year" },
  { key: "completedYear", label: "By Completion Year" },
  { key: "genre", label: "By Genre" },
  { key: "originalCreator", label: "By Original Creator" },
  { key: "studio", label: "By Studio" },
  { key: "lag", label: "Completion Lag" },
] as const;

type ActiveChart = (typeof chartOptions)[number]["key"];

type SelectionState =
  | {
      kind: "heatmap";
      key: string;
      title: string;
      description: string;
      entries: DerivedAnimeEntry[];
    }
  | {
      kind: "releaseYear";
      key: number;
      title: string;
      description: string;
      entries: DerivedAnimeEntry[];
    }
  | {
      kind: "completedYear";
      key: number;
      title: string;
      description: string;
      entries: DerivedAnimeEntry[];
    }
  | {
      kind: "genre";
      key: string;
      title: string;
      description: string;
      entries: DerivedAnimeEntry[];
    }
  | {
      kind: "originalCreator";
      key: string;
      title: string;
      description: string;
      entries: DerivedAnimeEntry[];
    }
  | {
      kind: "studio";
      key: string;
      title: string;
      description: string;
      entries: DerivedAnimeEntry[];
    }
  | {
      kind: "lag";
      key: number;
      title: string;
      description: string;
      entries: DerivedAnimeEntry[];
    }
  | null;

type TableSortKey =
  | "title"
  | "score"
  | "releaseYear"
  | "completedYear"
  | "format"
  | "genres";
type TableSortDirection = "asc" | "desc";

function sortSelectedEntries(entries: DerivedAnimeEntry[]): DerivedAnimeEntry[] {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if ((b.completedYear ?? -Infinity) !== (a.completedYear ?? -Infinity)) {
      return (b.completedYear ?? -Infinity) - (a.completedYear ?? -Infinity);
    }
    return a.title.localeCompare(b.title);
  });
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) {
    return "—";
  }
  if (seconds <= 0) {
    return "0m";
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export default function App() {
  const [draftUserName, setDraftUserName] = useState("");
  const [appliedUserName, setAppliedUserName] = useState("");
  const [entries, setEntries] = useState<DerivedAnimeEntry[]>([]);
  const [draftFilters, setDraftFilters] = useState<DashboardFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selection, setSelection] = useState<SelectionState>(null);
  const [activeChart, setActiveChart] = useState<ActiveChart>("heatmap");
  const [tableQuery, setTableQuery] = useState("");
  const [tableSort, setTableSort] = useState<{
    key: TableSortKey;
    direction: TableSortDirection;
  }>({
    key: "score",
    direction: "desc",
  });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState("25");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      if (!appliedUserName.trim()) {
        setEntries([]);
        setError("Enter an AniList username and press Refresh AniList.");
        setLoading(false);
        return;
      }
      try {
        const data = await fetchAnimeCollection(appliedUserName.trim());
        if (!cancelled) {
          setEntries(deriveEntries(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown AniList error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [appliedUserName, refreshToken]);

  const statuses = useMemo(() => getStatuses(entries), [entries]);
  const formats = useMemo(() => getFormats(entries), [entries]);
  const filtered = useMemo(
    () => applyFilters(entries, appliedFilters),
    [entries, appliedFilters],
  );
  const heatmap = useMemo(() => buildHeatmap(filtered), [filtered]);
  const highScoreByReleaseYear = useMemo(
    () => countByYear(filtered, (entry) => entry.releaseYear),
    [filtered],
  );
  const highScoreByCompletedYear = useMemo(
    () => countByYear(filtered, (entry) => entry.completedYear),
    [filtered],
  );
  const lagHistogram = useMemo(() => buildLagHistogram(filtered), [filtered]);
  const studioCounts = useMemo(
    () => countByStudio(filtered, { minScore: appliedFilters.minScore, limit: 15 }),
    [filtered, appliedFilters.minScore],
  );
  const genreCounts = useMemo(() => countByGenre(filtered, { limit: 15 }), [filtered]);
  const originalCreatorCounts = useMemo(
    () => countByOriginalCreator(filtered, { limit: 15 }),
    [filtered],
  );
  const currentlyAiring = useMemo(() => getCurrentlyAiring(entries), [entries]);

  useEffect(() => {
    setSelection(null);
  }, [appliedFilters, appliedUserName]);

  useEffect(() => {
    setSelection(null);
  }, [activeChart]);

  useEffect(() => {
    setTableQuery("");
    setTableSort({
      key: "score",
      direction: "desc",
    });
    setTablePage(1);
  }, [selection]);

  useEffect(() => {
    setTablePage(1);
  }, [tableQuery, tablePageSize]);

  const selectedHeatmapKey = selection?.kind === "heatmap" ? selection.key : null;
  const selectedReleaseYear = selection?.kind === "releaseYear" ? selection.key : null;
  const selectedCompletedYear = selection?.kind === "completedYear" ? selection.key : null;
  const selectedGenre = selection?.kind === "genre" ? selection.key : null;
  const selectedOriginalCreator =
    selection?.kind === "originalCreator" ? selection.key : null;
  const selectedStudio = selection?.kind === "studio" ? selection.key : null;
  const selectedLag = selection?.kind === "lag" ? selection.key : null;

  const activeChartIndex = chartOptions.findIndex((option) => option.key === activeChart);

  const visibleSelectionEntries = useMemo(() => {
    if (selection === null) {
      return [];
    }
    const lowered = tableQuery.trim().toLowerCase();
    const filteredEntries =
      lowered.length === 0
        ? selection.entries
        : selection.entries.filter((entry) => entry.title.toLowerCase().includes(lowered));

    const sorted = [...filteredEntries].sort((a, b) => {
      const direction = tableSort.direction === "asc" ? 1 : -1;
      switch (tableSort.key) {
        case "title":
          return a.title.localeCompare(b.title) * direction;
        case "score":
          return ((a.score ?? -Infinity) - (b.score ?? -Infinity)) * direction;
        case "releaseYear":
          return ((a.releaseYear ?? -Infinity) - (b.releaseYear ?? -Infinity)) * direction;
        case "completedYear":
          return ((a.completedYear ?? -Infinity) - (b.completedYear ?? -Infinity)) * direction;
        case "format":
          return a.format.localeCompare(b.format) * direction;
        case "genres":
          return a.genres.join(", ").localeCompare(b.genres.join(", ")) * direction;
        default:
          return 0;
      }
    });

    return sorted;
  }, [selection, tableQuery, tableSort]);

  const totalTablePages = Math.max(
    1,
    Math.ceil(visibleSelectionEntries.length / Number(tablePageSize)),
  );

  const pagedSelectionEntries = useMemo(() => {
    const startIndex = (tablePage - 1) * Number(tablePageSize);
    return visibleSelectionEntries.slice(startIndex, startIndex + Number(tablePageSize));
  }, [tablePage, tablePageSize, visibleSelectionEntries]);

  function stepChart(direction: -1 | 1) {
    const nextIndex =
      (activeChartIndex + direction + chartOptions.length) % chartOptions.length;
    setActiveChart(chartOptions[nextIndex].key);
  }

  function applyCurrentControls() {
    setAppliedUserName(draftUserName.trim());
    setAppliedFilters(draftFilters);
    setRefreshToken((value) => value + 1);
  }

  function toggleSort(key: TableSortKey) {
    setTableSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key,
        direction: key === "title" || key === "format" ? "asc" : "desc",
      };
    });
  }

  function sortLabel(key: TableSortKey, label: string) {
    if (tableSort.key !== key) {
      return label;
    }
    return `${label} ${tableSort.direction === "asc" ? "↑" : "↓"}`;
  }

  return (
    <Container size="xl" className="app-shell">
      <Paper radius="xl" p="lg" shadow="sm" className="header-strip">
        <Group justify="space-between" align="end" gap="xl" wrap="wrap">
          <Group gap="md" align="center" wrap="nowrap" className="brand-block">
            <div className="anilist-logo" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="img">
                <rect x="6" y="6" width="52" height="52" rx="12" fill="#2457A2" />
                <rect x="18" y="17" width="10" height="30" rx="5" fill="#FFFFFF" />
                <circle cx="44" cy="24" r="7" fill="#FFFFFF" />
                <rect x="34" y="33" width="16" height="10" rx="5" fill="#9BC2FF" />
              </svg>
            </div>
            <Stack gap={4}>
              <Text className="eyebrow">AniList user analytics</Text>
              <Title order={1} className="page-title">
                AniList User Analytics
              </Title>
            </Stack>
          </Group>
          <Text c="dimmed" maw={520} className="header-copy">
            Public AniList analytics with explicit refresh. Draft control changes stay local
            until you press Refresh AniList.
          </Text>
        </Group>
      </Paper>

      <Stack gap="lg" mt="lg">
        <FiltersPanel
          userName={draftUserName}
          userNamePlaceholder={EXAMPLE_USER}
          onUserNameChange={setDraftUserName}
          onRefresh={applyCurrentControls}
          loading={loading}
          statuses={statuses}
          formats={formats}
          filters={draftFilters}
          onFiltersChange={setDraftFilters}
        />

        {error ? (
          <Alert color="red" radius="md" title="AniList request failed" className="status-alert">
            {error}
          </Alert>
        ) : null}

        <Paper radius="xl" p="lg" shadow="sm" className="panel airing-panel">
          <Stack gap={4} mb="md">
            <Title order={2} size="h4">
              Currently Airing
            </Title>
            <Text c="dimmed" size="sm">
              Live airing view for entries with `CURRENT` status. This panel ignores the dashboard filters.
            </Text>
            <Text c="dimmed" size="sm">
              Total airing entries: {currentlyAiring.length}
            </Text>
          </Stack>
          {currentlyAiring.length === 0 ? (
            <Text c="dimmed" size="sm">
              No currently airing entries with `CURRENT` status were found on this AniList profile.
            </Text>
          ) : (
            <ScrollArea h={280} offsetScrollbars scrollbarSize={10} type="auto">
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                stickyHeader
                stickyHeaderOffset={0}
                horizontalSpacing="md"
                verticalSpacing="sm"
                className="results-table"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Progress</Table.Th>
                    <Table.Th>Next ep</Table.Th>
                    <Table.Th>Airs in</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {currentlyAiring.map((entry) => {
                    const airingAt = entry.nextAiringEpisode?.airingAt ?? null;
                    const secondsUntil =
                      airingAt === null
                        ? null
                        : Math.max(0, Math.floor((airingAt * 1000 - now) / 1000));
                    return (
                      <Table.Tr key={`airing-${entry.mediaId}`}>
                        <Table.Td>
                          <a
                            href={`https://anilist.co/anime/${entry.mediaId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="result-link"
                          >
                            {entry.title}
                          </a>
                        </Table.Td>
                        <Table.Td>{entry.status}</Table.Td>
                        <Table.Td>
                          {entry.progress}
                          {entry.episodes ? ` / ${entry.episodes}` : ""}
                        </Table.Td>
                        <Table.Td>{entry.nextAiringEpisode?.episode ?? "—"}</Table.Td>
                        <Table.Td>{formatCountdown(secondsUntil)}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Paper>

        <Paper radius="xl" p="lg" shadow="sm" className="workspace">
          <StatsGrid
            totalEntries={entries.length}
            filteredEntries={filtered.length}
            averageScore={averageScore(filtered)}
            medianLag={medianLag(filtered)}
          />

          <Paper radius="md" p="lg" shadow="sm" mt="lg" className="chart-stage">
            <Group justify="space-between" align="center" mb="md" wrap="wrap">
              <Stack gap={2}>
                <Title order={2} size="h4">
                  Chart Workspace
                </Title>
                <Text c="dimmed" size="sm">
                  One chart at a time. Switch views and click the chart to inspect matching anime.
                </Text>
              </Stack>
              <Group gap="xs" className="chart-switcher-wrap">
                <ActionIcon
                  variant="subtle"
                  radius="md"
                  size="lg"
                  onClick={() => stepChart(-1)}
                  aria-label="Previous chart"
                >
                  ‹
                </ActionIcon>
                <SegmentedControl
                  value={activeChart}
                  onChange={(value) => setActiveChart(value as ActiveChart)}
                  data={chartOptions.map((option) => ({
                    label: option.label,
                    value: option.key,
                  }))}
                />
                <ActionIcon
                  variant="subtle"
                  radius="md"
                  size="lg"
                  onClick={() => stepChart(1)}
                  aria-label="Next chart"
                >
                  ›
                </ActionIcon>
              </Group>
            </Group>

            {activeChart === "heatmap" ? (
              <HeatmapChart
                releaseYears={heatmap.releaseYears}
                completedYears={heatmap.completedYears}
                values={heatmap.values}
                selectedKey={selectedHeatmapKey}
                onSelect={(value) => {
                  if (value === null) {
                    setSelection(null);
                    return;
                  }
                  const entries = sortSelectedEntries(
                    filtered.filter(
                      (entry) =>
                        entry.releaseYear === value.releaseYear &&
                        entry.completedYear === value.completedYear,
                    ),
                  );
                  setSelection({
                    kind: "heatmap",
                    key: `${value.releaseYear}:${value.completedYear}`,
                    title: `Released ${value.releaseYear}, completed ${value.completedYear}`,
                    description: "Entries selected from the heatmap.",
                    entries,
                  });
                }}
              />
            ) : null}

            {activeChart === "releaseYear" ? (
              <YearBarChart
                title="Scores by Release Year"
                subtitle={`How many anime match the current applied filter, grouped by release year. Min score is ${appliedFilters.minScore}. Click a bar to list titles.`}
                data={highScoreByReleaseYear}
                xLabel="Release year"
                selectedYear={selectedReleaseYear}
                onYearSelect={(year) => {
                  if (year === null) {
                    setSelection(null);
                    return;
                  }
                  const entries = sortSelectedEntries(
                    filtered.filter((entry) => entry.releaseYear === year),
                  );
                  setSelection({
                    kind: "releaseYear",
                    key: year,
                    title: `Filtered entries released in ${year}`,
                    description: "Entries selected from the release year chart.",
                    entries,
                  });
                }}
              />
            ) : null}

            {activeChart === "completedYear" ? (
              <YearBarChart
                title="Scores by Completion Year"
                subtitle={`How many anime match the current applied filter, grouped by completion year. Min score is ${appliedFilters.minScore}. Click a bar to list titles.`}
                data={highScoreByCompletedYear}
                xLabel="Completed year"
                color="#ff8c42"
                selectedYear={selectedCompletedYear}
                onYearSelect={(year) => {
                  if (year === null) {
                    setSelection(null);
                    return;
                  }
                  const entries = sortSelectedEntries(
                    filtered.filter((entry) => entry.completedYear === year),
                  );
                  setSelection({
                    kind: "completedYear",
                    key: year,
                    title: `Filtered entries completed in ${year}`,
                    description: "Entries selected from the completion year chart.",
                    entries,
                  });
                }}
              />
            ) : null}

            {activeChart === "genre" ? (
              <GenreBarChart
                data={genreCounts}
                selectedGenre={selectedGenre}
                onGenreSelect={(genre) => {
                  if (genre === null) {
                    setSelection(null);
                    return;
                  }
                  const entries = sortSelectedEntries(
                    filtered.filter((entry) => entry.genres.includes(genre)),
                  );
                  setSelection({
                    kind: "genre",
                    key: genre,
                    title: genre,
                    description: "Entries selected from the genre chart.",
                    entries,
                  });
                }}
              />
            ) : null}

            {activeChart === "originalCreator" ? (
              <OriginalCreatorBarChart
                data={originalCreatorCounts}
                selectedCreator={selectedOriginalCreator}
                onCreatorSelect={(creator) => {
                  if (creator === null) {
                    setSelection(null);
                    return;
                  }
                  const entries = sortSelectedEntries(
                    filtered.filter((entry) => entry.originalCreators.includes(creator)),
                  );
                  setSelection({
                    kind: "originalCreator",
                    key: creator,
                    title: creator,
                    description: "Entries selected from the original creator chart.",
                    entries,
                  });
                }}
              />
            ) : null}

            {activeChart === "studio" ? (
              <StudioBarChart
                data={studioCounts}
                selectedStudio={selectedStudio}
                onStudioSelect={(studio) => {
                  if (studio === null) {
                    setSelection(null);
                    return;
                  }
                  const entries = sortSelectedEntries(
                    filtered.filter((entry) => entry.studios.includes(studio)),
                  );
                  setSelection({
                    kind: "studio",
                    key: studio,
                    title: studio,
                    description: "Entries selected from the studio chart.",
                    entries,
                  });
                }}
              />
            ) : null}

            {activeChart === "lag" ? (
              <LagHistogramChart
                data={lagHistogram}
                selectedLag={selectedLag}
                onLagSelect={(lag) => {
                  if (lag === null) {
                    setSelection(null);
                    return;
                  }
                  const entries = sortSelectedEntries(
                    filtered.filter((entry) => entry.lagYears === lag),
                  );
                  setSelection({
                    kind: "lag",
                    key: lag,
                    title: `${lag} year completion lag`,
                    description: "Entries selected from the lag histogram.",
                    entries,
                  });
                }}
              />
            ) : null}
          </Paper>
        </Paper>
      </Stack>

      {selection !== null ? (
        <Paper radius="xl" p="lg" shadow="sm" mt="xl" className="panel results-panel">
          <Stack gap={4} mb="md">
            <Title order={2} size="h4">
              {selection.title}
            </Title>
            <Text c="dimmed" size="sm">
              {selection.description} Click the same chart item again to clear.
            </Text>
          </Stack>
          <Group justify="space-between" align="end" mb="md" wrap="wrap">
            <TextInput
              label="Search titles"
              placeholder="Filter selected anime"
              value={tableQuery}
              onChange={(event) => setTableQuery(event.currentTarget.value)}
              w={320}
            />
          </Group>
          <ScrollArea h={420} offsetScrollbars scrollbarSize={10} type="auto">
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              stickyHeader
              stickyHeaderOffset={0}
              horizontalSpacing="md"
              verticalSpacing="sm"
              className="results-table"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th onClick={() => toggleSort("title")} style={{ cursor: "pointer" }}>
                    {sortLabel("title", "Title")}
                  </Table.Th>
                  <Table.Th onClick={() => toggleSort("score")} style={{ cursor: "pointer" }}>
                    {sortLabel("score", "Score")}
                  </Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th
                    onClick={() => toggleSort("releaseYear")}
                    style={{ cursor: "pointer" }}
                  >
                    {sortLabel("releaseYear", "Release")}
                  </Table.Th>
                  <Table.Th
                    onClick={() => toggleSort("completedYear")}
                    style={{ cursor: "pointer" }}
                  >
                    {sortLabel("completedYear", "Completed")}
                  </Table.Th>
                  <Table.Th onClick={() => toggleSort("format")} style={{ cursor: "pointer" }}>
                    {sortLabel("format", "Format")}
                  </Table.Th>
                  <Table.Th onClick={() => toggleSort("genres")} style={{ cursor: "pointer" }}>
                    {sortLabel("genres", "Genres")}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pagedSelectionEntries.map((entry) => (
                  <Table.Tr key={`${selection.kind}-${selection.key}-${entry.mediaId}`}>
                    <Table.Td>
                      <a
                        href={`https://anilist.co/anime/${entry.mediaId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="result-link"
                      >
                        {entry.title}
                      </a>
                    </Table.Td>
                    <Table.Td>{entry.score}</Table.Td>
                    <Table.Td>{entry.status}</Table.Td>
                    <Table.Td>{entry.releaseYear ?? "—"}</Table.Td>
                    <Table.Td>{entry.completedYear ?? "—"}</Table.Td>
                    <Table.Td>{entry.format}</Table.Td>
                    <Table.Td>{entry.genres.join(", ") || "—"}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group justify="flex-end" align="center" mt="md" wrap="wrap" gap="md">
            <Group gap="xs" align="center" className="table-footer-rows">
              <Text size="sm" fw={500}>
                Rows
              </Text>
              <Select
                value={tablePageSize}
                onChange={(value) => setTablePageSize(value ?? "25")}
                data={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                ]}
                w={90}
              />
            </Group>
            <Pagination
              value={tablePage}
              onChange={setTablePage}
              total={totalTablePages}
              radius="md"
              size="sm"
            />
            <Text c="dimmed" size="sm">
              {visibleSelectionEntries.length === 0
                ? "0 results"
                : `${(tablePage - 1) * Number(tablePageSize) + 1}–${Math.min(
                    tablePage * Number(tablePageSize),
                    visibleSelectionEntries.length,
                  )} of ${visibleSelectionEntries.length}`}
            </Text>
          </Group>
        </Paper>
      ) : null}
    </Container>
  );
}
