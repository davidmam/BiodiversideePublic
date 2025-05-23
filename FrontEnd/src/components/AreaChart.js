"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

export const ScrollableTooltipContent = ({
  active,
  payload,
  label,
  hideLabel,
  config,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

  const formatLabel = (label) => {
    if (label instanceof Date) {
      return label.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    if (
      typeof label === "string" &&
      !isNaN(Date.parse(label)) &&
      label.match(/^\d{4}-\d{2}-\d{2}|^\d+$/)
    ) {
      return new Date(label).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    return String(label);
  };

  return (
    <div
      style={{ maxHeight: "80vh", pointerEvents: "auto" }}
      className="rounded-lg border bg-background p-2 shadow-md"
    >
      {!hideLabel && (
        <div className="mb-2 font-medium">{formatLabel(label)}</div>
      )}
      {/* Apply fixed height and force overflow-y scroll */}
      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          display: "block",
          paddingRight: "10px",
          marginRight: "-5px",
          pointerEvents: "auto",
        }}
      >
        {sortedPayload.map((item, index) => {
          const color = config?.[item.dataKey]?.color || item.color;
          return (
            <div key={`item-${index}`} className="flex items-center py-1">
              <div
                className="mr-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {!hideLabel && (
                <span className="mr-2 flex-1 font-medium">
                  {config?.[item.dataKey]?.label || item.name}:
                </span>
              )}
              <span>
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : String(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const defaultColors = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function MyAreaChart({
  title,
  description,
  data,
  type,
  xAxisKey = "timestamp",
  trend = 5.2,
  footer,
  subfooter = "January - June 2024",
  loading: initialLoading = false,
}) {
  const [loading, setLoading] = useState(initialLoading);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timeout);
  }, [data]);

  let dataKeys = [];
  if (data && data.length > 0) {
    for (const point of data) {
      dataKeys = dataKeys.concat(
        Object.keys(point).filter((key) => key !== xAxisKey)
      );
    }
    dataKeys = [...new Set(dataKeys)];
  }

  const config = useMemo(() => {
    return dataKeys.reduce((acc, key, index) => {
      acc[key] = {
        color:
          type === "Shannon"
            ? defaultColors[index % defaultColors.length]
            : defaultColors[(index + 1) % defaultColors.length],
      };
      return acc;
    }, {});
  }, [dataKeys]);

  const sortedKeys = useMemo(() => {
    if (!data || data.length === 0) return [];

    const latestDataPoint = data[data.length - 1];

    return [...dataKeys].sort((a, b) => {
      const valueA = latestDataPoint[a] !== undefined ? latestDataPoint[a] : 0;
      const valueB = latestDataPoint[b] !== undefined ? latestDataPoint[b] : 0;

      return valueB - valueA;
    });
  }, [data, dataKeys]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[250px] w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ChartContainer
            className="aspect-auto h-[250px] w-full"
            config={config}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 20, left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey={xAxisKey}
                  tickFormatter={(value) => {
                    if (typeof value === "string" && value.includes("-")) {
                      return value;
                    }
                    const date = new Date(value);
                    const day = String(date.getDate()).padStart(2, "0");
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const year = String(date.getFullYear()).slice(-2);
                    return `${day}-${month}-${year}`;
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} width={35} />
                {true && (
                  <ChartTooltip
                    wrapperStyle={{ zIndex: 1000 }}
                    content={<ScrollableTooltipContent config={config} />}
                  />
                )}
                {sortedKeys.map((key) => (
                  <Line
                    key={key}
                    dataKey={key}
                    type="monotone"
                    stroke={config[key].color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">{footer}</div>
        <div className="leading-none text-muted-foreground">{subfooter}</div>
      </CardFooter>
    </Card>
  );
}
