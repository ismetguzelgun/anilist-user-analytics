import {
  Button,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { DashboardFilters } from "../lib/types";

type FiltersPanelProps = {
  userName: string;
  userNamePlaceholder?: string;
  onUserNameChange: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
  statuses: string[];
  formats: string[];
  filters: DashboardFilters;
  onFiltersChange: (next: DashboardFilters) => void;
};

export function FiltersPanel({
  userName,
  userNamePlaceholder,
  onUserNameChange,
  onRefresh,
  loading,
  statuses,
  formats,
  filters,
  onFiltersChange,
}: FiltersPanelProps) {
  function update<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <Paper radius="xl" p="lg" shadow="sm" className="panel filters-panel">
      <Group justify="space-between" align="end" mb="md" wrap="wrap" className="filters-header">
        <Stack gap={2}>
          <Title order={2} size="h4">
            Controls
          </Title>
          <Text c="dimmed" size="sm">
            Draft changes stay local until refresh.
          </Text>
        </Stack>
      </Group>
      <Stack gap={4} mb="md">
        <Title order={3} size="h6">
          Filters
        </Title>
        <Text c="dimmed" size="sm">
          Public AniList profile query with local chart transforms.
        </Text>
      </Stack>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <TextInput
            label="User name"
            placeholder={userNamePlaceholder}
            value={userName}
            onChange={(event) => onUserNameChange(event.target.value)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Select
            label="Status"
            value={filters.status}
            onChange={(value) => update("status", value ?? "ALL")}
            data={["ALL", ...statuses]}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <Select
            label="Format"
            value={filters.format}
            onChange={(value) => update("format", value ?? "ALL")}
            data={["ALL", ...formats]}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <NumberInput
            label="Min score"
            min={0}
            max={10}
            step={1}
            value={filters.minScore}
            onChange={(value) => update("minScore", Number(value) || 0)}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <NumberInput
            label="Release year min"
            value={filters.releaseYearMin ?? undefined}
            onChange={(value) =>
              update("releaseYearMin", typeof value === "number" ? value : null)
            }
            allowDecimal={false}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <NumberInput
            label="Release year max"
            value={filters.releaseYearMax ?? undefined}
            onChange={(value) =>
              update("releaseYearMax", typeof value === "number" ? value : null)
            }
            allowDecimal={false}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <NumberInput
            label="Completed year min"
            value={filters.completedYearMin ?? undefined}
            onChange={(value) =>
              update("completedYearMin", typeof value === "number" ? value : null)
            }
            allowDecimal={false}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
          <NumberInput
            label="Completed year max"
            value={filters.completedYearMax ?? undefined}
            onChange={(value) =>
              update("completedYearMax", typeof value === "number" ? value : null)
            }
            allowDecimal={false}
          />
        </Grid.Col>
      </Grid>
      <Group justify="flex-end" mt="md">
        <Button radius="md" onClick={onRefresh} loading={loading} className="refresh-button">
          Refresh AniList
        </Button>
      </Group>
    </Paper>
  );
}
