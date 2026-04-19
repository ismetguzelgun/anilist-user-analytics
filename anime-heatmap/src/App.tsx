import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Container,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
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
import { StudioBarChart } from "./components/charts/StudioBarChart";
import { YearBarChart } from "./components/charts/YearBarChart";
import {
  applyFilters,
  averageScore,
  buildHeatmap,
  buildLagHistogram,
  countByYear,
  countByStudio,
  deriveEntries,
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

type TableSortKey = "title" | "score" | "releaseYear" | "completedYear" | "format";
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
  }, [selection]);

  const selectedHeatmapKey = selection?.kind === "heatmap" ? selection.key : null;
  const selectedReleaseYear = selection?.kind === "releaseYear" ? selection.key : null;
  const selectedCompletedYear = selection?.kind === "completedYear" ? selection.key : null;
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
        default:
          return 0;
      }
    });

    return sorted;
  }, [selection, tableQuery, tableSort]);

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
    <Container size="xl" py="xl">
      <Paper radius="xl" p="xl" shadow="sm" className="hero">
        <Stack gap="xs">
          <Text className="eyebrow">AniList watch analytics</Text>
          <Title order={1}>Anime Heatmap</Title>
          <Text c="dimmed" maw={720}>
            Public AniList analytics with explicit refresh. Draft filter changes stay local
            until you press Refresh AniList.
          </Text>
        </Stack>
      </Paper>

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
        <Alert color="red" radius="xl" mt="xl" title="AniList request failed">
          {error}
        </Alert>
      ) : null}

      <StatsGrid
        totalEntries={entries.length}
        filteredEntries={filtered.length}
        averageScore={averageScore(filtered)}
        medianLag={medianLag(filtered)}
      />

      <Paper radius="xl" p="lg" shadow="sm" mt="xl" className="panel">
        <Group justify="space-between" align="center" mb="md" wrap="wrap">
          <Stack gap={2}>
            <Title order={2} size="h4">
              Chart Stage
            </Title>
            <Text c="dimmed" size="sm">
              One chart at a time. Switch views and click the chart to inspect matching anime.
            </Text>
          </Stack>
          <Group gap="xs">
            <ActionIcon
              variant="light"
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
              variant="light"
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

      {selection !== null ? (
        <Paper radius="xl" p="lg" shadow="sm" mt="xl" className="panel studio-list-panel">
          <Stack gap={4} mb="md">
            <Title order={2} size="h4">
              {selection.title}
            </Title>
            <Text c="dimmed" size="sm">
              {selection.entries.length} anime in the current filter, {visibleSelectionEntries.length} visible after table search. {selection.description}
              {" "}Click the same chart item again to clear.
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
            <Text c="dimmed" size="sm">
              Click a header to sort.
            </Text>
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
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleSelectionEntries.map((entry) => (
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
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      ) : null}
    </Container>
  );
}
