import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ScrollableTooltipContent } from "./AreaChart";

const defaultColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function QueryAggregationBarChart({
  title,
  description,
  footer,
  subfooter,
  data,
  xAxisKey,
  long,
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [data]);

  let dataKeys = [];
  for (const bar of data) {
    dataKeys = dataKeys.concat(
      Object.keys(bar).filter((key) => key !== xAxisKey)
    );
  }
  dataKeys = [...new Set(dataKeys)];

  const config = dataKeys.reduce((acc, key, index) => {
    acc[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: defaultColors[index % defaultColors.length],
    };
    return acc;
  }, {});

  const sortedKeys = useMemo(
    () => [...dataKeys].sort((a, b) => a.localeCompare(b)),
    [dataKeys]
  );

  console.log("Sorted keys:", sortedKeys);

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
            className={long && "aspect-auto h-[250px] w-full"}
            config={config}
          >
            <BarChart margin={{ top: 20 }} accessibilityLayer data={data}>
              <CartesianGrid vertical={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1e9) {
                    return `${(value / 1e9).toFixed(1)}b`;
                  } else if (value >= 1e6) {
                    return `${(value / 1e6).toFixed(1)}m`;
                  } else if (value >= 1e3) {
                    return `${(value / 1e3).toFixed(1)}k`;
                  }
                  return value;
                }}
                width={35}
              />
              <XAxis
                dataKey={xAxisKey}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  const day = String(date.getDate()).padStart(2, "0");
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const year = String(date.getFullYear()).slice(-2);
                  return `${day}-${month}-${year}`;
                }}
              />

              <ChartTooltip
                wrapperStyle={{ zIndex: 1000 }}
                content={<ScrollableTooltipContent config={config} />}
              />

              {sortedKeys.map((key) => (
                <Bar
                  isAnimationActive={false}
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={config[key].color}
                />
              ))}
            </BarChart>
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
