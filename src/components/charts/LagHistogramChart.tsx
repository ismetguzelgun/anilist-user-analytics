import ReactECharts from "echarts-for-react";
import { ChartPanel } from "../ChartPanel";

type LagHistogramChartProps = {
  data: Array<[number, number]>;
  selectedLag: number | null;
  onLagSelect: (lag: number | null) => void;
};

export function LagHistogramChart({
  data,
  selectedLag,
  onLagSelect,
}: LagHistogramChartProps) {
  const option = {
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: 56,
      right: 28,
      top: 28,
      bottom: 84,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      name: "Lag in years",
      nameLocation: "middle",
      nameGap: 56,
      axisLabel: {
        interval: 0,
        rotate: 30,
        hideOverlap: true,
        margin: 16,
      },
      data: data.map(([lag]) => lag),
    },
    yAxis: {
      type: "value",
      name: "Count",
      nameLocation: "middle",
      nameGap: 48,
      nameRotate: 90,
      axisLabel: {
        margin: 12,
      },
    },
    series: [
      {
        type: "bar",
        data: data.map(([, count]) => count),
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const lag = data[params.dataIndex]?.[0];
            return lag === selectedLag ? "#ef476f" : "#1677ff";
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
            left: 42,
            right: 12,
            top: 20,
            bottom: 72,
            containLabel: true,
          },
          xAxis: {
            nameGap: 42,
            axisLabel: {
              interval: "auto",
              rotate: 40,
              hideOverlap: true,
              margin: 10,
              fontSize: 10,
            },
          },
          yAxis: {
            nameGap: 34,
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
    click: (params: { dataIndex?: number }) => {
      const lag = data[params.dataIndex ?? -1]?.[0] ?? null;
      if (lag === null) {
        return;
      }
      onLagSelect(lag === selectedLag ? null : lag);
    },
  };

  return (
    <ChartPanel
      title="Completion Lag"
      subtitle="How many years usually pass between release and your completion date. Click a bar to list matching anime."
    >
      <ReactECharts option={option} onEvents={onEvents} style={{ height: 380, minWidth: 0 }} />
    </ChartPanel>
  );
}
