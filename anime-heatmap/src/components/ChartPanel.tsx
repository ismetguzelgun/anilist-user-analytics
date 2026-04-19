import type { PropsWithChildren } from "react";
import { Paper, Stack, Text, Title } from "@mantine/core";

type ChartPanelProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function ChartPanel({ title, subtitle, children }: ChartPanelProps) {
  return (
    <Paper radius="xl" p="lg" shadow="sm" className="panel">
      <Stack gap={4} mb="md">
        <Title order={2} size="h4">
          {title}
        </Title>
        {subtitle ? (
          <Text c="dimmed" size="sm">
            {subtitle}
          </Text>
        ) : null}
      </Stack>
      {children}
    </Paper>
  );
}
