import ReactECharts from "echarts-for-react";
import { ChartPanel } from "../ChartPanel";

type YearBarChartProps = {
  title: string;
  subtitle: string;
  data: Array<[number, number]>;
  xLabel: string;
  color?: string;
  selectedYear: number | null;
  onYearSelect: (year: number | null) => void;
};

export function YearBarChart({
  title,
  subtitle,
  data,
  xLabel,
  color = "#ff6b35",
  selectedYear,
  onYearSelect,
}: YearBarChartProps) {
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
      name: xLabel,
      nameLocation: "middle",
      nameGap: 56,
      axisLabel: {
        interval: 0,
        rotate: 35,
        hideOverlap: true,
        margin: 16,
      },
      data: data.map(([year]) => year),
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
            const year = data[params.dataIndex]?.[0];
            return year === selectedYear ? "#ef476f" : color;
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
              rotate: 50,
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
      const year = data[params.dataIndex ?? -1]?.[0] ?? null;
      if (year === null) {
        return;
      }
      onYearSelect(year === selectedYear ? null : year);
    },
  };

  return (
    <ChartPanel title={title} subtitle={subtitle}>
      <ReactECharts option={option} onEvents={onEvents} style={{ height: 380, minWidth: 0 }} />
    </ChartPanel>
  );
}
