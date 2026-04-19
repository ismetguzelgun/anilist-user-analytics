import ReactECharts from "echarts-for-react";
import { ChartPanel } from "../ChartPanel";

type StudioBarChartProps = {
  data: Array<[string, number]>;
  selectedStudio: string | null;
  onStudioSelect: (studio: string | null) => void;
};

export function StudioBarChart({
  data,
  selectedStudio,
  onStudioSelect,
}: StudioBarChartProps) {
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
      name: "High-score count",
    },
    yAxis: {
      type: "category",
      data: data.map(([studio]) => studio),
      inverse: true,
      axisLabel: {
        width: 110,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: data.map(([, count]) => count),
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const studio = data[params.dataIndex]?.[0];
            return studio === selectedStudio ? "#ef476f" : "#118ab2";
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
            left: 100,
            right: 12,
            top: 16,
            bottom: 20,
          },
          yAxis: {
            axisLabel: {
              width: 84,
              overflow: "truncate",
              fontSize: 10,
            },
          },
          xAxis: {
            axisLabel: {
              fontSize: 10,
            },
          },
        },
      },
    ],
  };

  const onEvents = {
    click: (params: { dataIndex?: number }) => {
      const studio = data[params.dataIndex ?? -1]?.[0] ?? null;
      if (studio === null) {
        return;
      }
      onStudioSelect(studio === selectedStudio ? null : studio);
    },
  };

  return (
    <ChartPanel
      title="Scores by Studio"
      subtitle="Top studios by number of anime in the current filter. Click a bar to list its titles."
    >
      <ReactECharts option={option} onEvents={onEvents} style={{ height: 420, minWidth: 0 }} />
    </ChartPanel>
  );
}
