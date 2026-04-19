import { Paper, SimpleGrid, Text, Title } from "@mantine/core";

type StatsGridProps = {
  totalEntries: number;
  filteredEntries: number;
  averageScore: number;
  medianLag: number | null;
};

export function StatsGrid({
  totalEntries,
  filteredEntries,
  averageScore,
  medianLag,
}: StatsGridProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" className="stats-strip">
      <Paper radius="md" p="md" shadow="sm" className="stat-card">
        <Text c="dimmed" size="sm">
          All anime entries
        </Text>
        <Title order={3} mt={6}>
          {totalEntries}
        </Title>
      </Paper>
      <Paper radius="md" p="md" shadow="sm" className="stat-card">
        <Text c="dimmed" size="sm">
          Entries in current filter
        </Text>
        <Title order={3} mt={6}>
          {filteredEntries}
        </Title>
      </Paper>
      <Paper radius="md" p="md" shadow="sm" className="stat-card">
        <Text c="dimmed" size="sm">
          Average score
        </Text>
        <Title order={3} mt={6}>
          {averageScore.toFixed(2)}
        </Title>
      </Paper>
      <Paper radius="md" p="md" shadow="sm" className="stat-card">
        <Text c="dimmed" size="sm">
          Median completion lag
        </Text>
        <Title order={3} mt={6}>
          {medianLag === null ? "n/a" : `${medianLag}y`}
        </Title>
      </Paper>
    </SimpleGrid>
  );
}
