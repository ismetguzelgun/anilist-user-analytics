import ReactECharts from "echarts-for-react";
import { ChartPanel } from "../ChartPanel";

type GenreBarChartProps = {
  data: Array<[string, number]>;
  selectedGenre: string | null;
  onGenreSelect: (genre: string | null) => void;
};

export function GenreBarChart({
  data,
  selectedGenre,
  onGenreSelect,
}: GenreBarChartProps) {
  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    grid: {
      left: 140,
      right: 24,
      top: 20,
      bottom: 24,
    },
    xAxis: {
      type: "value",
      name: "Anime count",
    },
    yAxis: {
      type: "category",
      data: data.map(([genre]) => genre),
      inverse: true,
    },
    series: [
      {
        type: "bar",
        data: data.map(([, count]) => count),
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const genre = data[params.dataIndex]?.[0];
            return genre === selectedGenre ? "#ef476f" : "#2a6fdb";
          },
        },
      },
    ],
  };

  const onEvents = {
    click: (params: { dataIndex?: number }) => {
      const genre = data[params.dataIndex ?? -1]?.[0] ?? null;
      if (genre === null) {
        return;
      }
      onGenreSelect(genre === selectedGenre ? null : genre);
    },
  };

  return (
    <ChartPanel
      title="By Genre"
      subtitle="Top genres in the current filter. Click a bar to list matching anime."
    >
      <ReactECharts option={option} onEvents={onEvents} style={{ height: 420 }} />
    </ChartPanel>
  );
}
