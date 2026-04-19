import ReactECharts from "echarts-for-react";
import { ChartPanel } from "../ChartPanel";

type HeatmapChartProps = {
  releaseYears: number[];
  completedYears: number[];
  values: Array<[number, number, number]>;
  selectedKey: string | null;
  onSelect: (value: { releaseYear: number; completedYear: number } | null) => void;
};

export function HeatmapChart({
  releaseYears,
  completedYears,
  values,
  selectedKey,
  onSelect,
}: HeatmapChartProps) {
  const option = {
    tooltip: {
      position: "top",
      formatter: (params: { value: [number, number, number] }) => {
        const [releaseIndex, completedIndex, count] = params.value;
        return `Release ${releaseYears[releaseIndex]}<br/>Completed ${completedYears[completedIndex]}<br/>Count ${count}`;
      },
    },
    grid: {
      left: 72,
      right: 36,
      top: 40,
      bottom: 88,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: releaseYears,
      name: "Release year",
      nameLocation: "middle",
      nameGap: 56,
      axisLabel: {
        interval: 0,
        rotate: 35,
        hideOverlap: true,
        margin: 16,
      },
      splitArea: { show: true },
    },
    yAxis: {
      type: "category",
      data: completedYears,
      name: "Completed year",
      nameLocation: "middle",
      nameGap: 56,
      nameRotate: 90,
      axisLabel: {
        margin: 12,
      },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max: Math.max(...values.map((value) => value[2]), 1),
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 12,
    },
    series: [
      {
        type: "heatmap",
        data: values,
        label: { show: false },
        itemStyle: {
          borderColor: (params: { value: [number, number, number] }) => {
            const [releaseIndex, completedIndex] = params.value;
            const key = `${releaseYears[releaseIndex]}:${completedYears[completedIndex]}`;
            return key === selectedKey ? "#ef476f" : "rgba(255,255,255,0.35)";
          },
          borderWidth: (params: { value: [number, number, number] }) => {
            const [releaseIndex, completedIndex] = params.value;
            const key = `${releaseYears[releaseIndex]}:${completedYears[completedIndex]}`;
            return key === selectedKey ? 2 : 1;
          },
        },
        emphasis: {
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 1,
          },
        },
      },
    ],
    media: [
      {
        query: {
          maxWidth: 720,
        },
        option: {
          grid: {
            left: 48,
            right: 12,
            top: 28,
            bottom: 84,
            containLabel: true,
          },
          xAxis: {
            nameGap: 42,
            axisLabel: {
              interval: "auto",
              rotate: 50,
              hideOverlap: true,
              margin: 10,
              fontSize: 10,
            },
          },
          yAxis: {
            nameGap: 38,
            axisLabel: {
              margin: 8,
              fontSize: 10,
            },
          },
        },
      },
    ],
  };

  const onEvents = {
    click: (params: { value?: [number, number, number] }) => {
      if (!params.value) {
        return;
      }
      const [releaseIndex, completedIndex] = params.value;
      const releaseYear = releaseYears[releaseIndex];
      const completedYear = completedYears[completedIndex];
      const key = `${releaseYear}:${completedYear}`;
      onSelect(key === selectedKey ? null : { releaseYear, completedYear });
    },
  };

  return (
    <ChartPanel
      title="Release Year vs Completed Year"
      subtitle="Where your finished anime cluster across release time and watch time. Click a cell to list matching anime."
    >
      <ReactECharts option={option} onEvents={onEvents} style={{ height: 500, minWidth: 0 }} />
    </ChartPanel>
  );
}
