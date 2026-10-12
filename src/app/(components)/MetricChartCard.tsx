"use client";

import { useMemo } from "react";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import TrendChart, { TrendPoint } from "./utilts/TrendChart";

type RangeType = "30d" | "90d" | "365d" | "lifetime";

const RANGE_LABELS: Record<RangeType, string> = {
  "30d": "30 days",
  "90d": "90 days",
  "365d": "1 year",
  lifetime: "lifetime",
};

const formatCount = (n: number) => n.toLocaleString("en-IN");

export type MetricChartCardProps = {
  title: string;
  data: { label: string | number; count: number }[];
  range?: RangeType;
  color?: string;
  metricLabel?: string;
};

export default function MetricChartCard({
  title,
  data,
  range = "90d",
  color = "#0ea5e9",
  metricLabel,
}: MetricChartCardProps) {
  const chartPoints: TrendPoint[] = useMemo(
    () =>
      (data || []).map((d, i) => {
        const label = String(d.label);
        const value = Number(d.count) || 0;
        return {
          key: `${label}-${i}`,
          label,
          value,
          tooltipTitle: formatCount(value),
          tooltipSubtitle: `${label} • ${metricLabel || "count"}`,
        };
      }),
    [data, metricLabel],
  );

  const total = useMemo(
    () => chartPoints.reduce((s, p) => s + p.value, 0),
    [chartPoints],
  );

  const trend = useMemo(() => {
    if (chartPoints.length < 2) return "flat" as const;
    const prev = chartPoints[chartPoints.length - 2].value;
    const last = chartPoints[chartPoints.length - 1].value;
    if (last > prev) return "up" as const;
    if (last < prev) return "down" as const;
    return "flat" as const;
  }, [chartPoints]);

  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-rose-600"
        : "text-stone-400";

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 color={color} size={18} className="shrink-0" />
          <h3 className="truncate text-sm font-medium text-stone-600">
            {title.trim()} ({RANGE_LABELS[range] ?? range})
          </h3>
        </div>
        {chartPoints.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-stone-100 bg-stone-50 px-2.5 py-1 text-xs text-stone-600">
            <TrendIcon size={12} className={trendColor} />
            <span className="font-semibold text-stone-800">
              {formatCount(total)}
            </span>
          </div>
        )}
      </div>

      <TrendChart
        points={chartPoints}
        color={color}
        formatValue={formatCount}
        heightClassName="h-44 sm:h-52"
        axisWidthClassName="w-8 sm:w-10"
        emptyState={
          <>
            <BarChart3 className="mb-2 h-8 w-8 text-stone-300" />
            No data for the selected range
          </>
        }
      />
    </div>
  );
}
