import { colors } from "@/common";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ScrollableTooltipContent } from "./AreaChart";

export function MyStackedBarChart({
  title,
  description,
  footer,
  subfooter,
  data,
  xAxisKey,
  trend = 5.2,
  long,
}) {
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
      color: colors[index % colors.length],
    };
    return acc;
  }, {});

  const [selectedKey, setSelectedKey] = useState("ALL");

  const filteredData =
    selectedKey === "ALL"
      ? data
      : data.map((entry) => ({
          [xAxisKey]: entry[xAxisKey],
          [selectedKey]: entry[selectedKey] || 0,
        }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Select value={selectedKey} onValueChange={setSelectedKey}>
          <SelectTrigger className="ml-auto h-7 w-[130px] rounded-lg pl-2.5">
            <SelectValue placeholder="Select species" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            <SelectItem value="ALL" className="rounded-lg [&_span]:flex">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-3 w-3 shrink-0 rounded-sm bg-gray-300" />
                All
              </div>
            </SelectItem>
            {dataKeys.map((key) => (
              <SelectItem
                key={key}
                value={key}
                className="rounded-lg [&_span]:flex"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: config[key].color }}
                  />
                  {config[key].label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-grow">
        <ChartContainer
          className={"aspect-auto h-[400px] w-full"}
          config={config}
        >
          <BarChart data={filteredData} margin={{ top: 10, bottom: 20 }}>
            <CartesianGrid vertical={false} />
            <YAxis width={35} tickLine={false} axisLine={false} />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              angle={-75}
              tickMargin={20}
            />
            <ChartTooltip
              wrapperStyle={{ zIndex: 1000 }}
              content={<ScrollableTooltipContent config={config} />}
            />
            {dataKeys
              .filter((key) => selectedKey === "ALL" || key === selectedKey)
              .map((key) => (
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
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 mt-auto">
        {footer}
      </CardFooter>
    </Card>
  );
}
