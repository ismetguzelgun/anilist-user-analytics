import ReactECharts from "echarts-for-react";
import { ChartPanel } from "../ChartPanel";

type OriginalCreatorBarChartProps = {
  data: Array<[string, number]>;
  selectedCreator: string | null;
  onCreatorSelect: (creator: string | null) => void;
};

export function OriginalCreatorBarChart({
  data,
  selectedCreator,
  onCreatorSelect,
}: OriginalCreatorBarChartProps) {
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
      data: data.map(([creator]) => creator),
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
            const creator = data[params.dataIndex]?.[0];
            return creator === selectedCreator ? "#ef476f" : "#5d78ff";
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
      const creator = data[params.dataIndex ?? -1]?.[0] ?? null;
      if (creator === null) {
        return;
      }
      onCreatorSelect(creator === selectedCreator ? null : creator);
    },
  };

  return (
    <ChartPanel
      title="By Original Creator"
      subtitle="Top original creators in the current filter. Click a bar to list matching anime."
    >
      <ReactECharts option={option} onEvents={onEvents} style={{ height: 420, minWidth: 0 }} />
    </ChartPanel>
  );
}
