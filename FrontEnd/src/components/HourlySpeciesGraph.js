import { colors } from "@/common";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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

export function HourlySpeciesGraph({
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

  const [activeItem, setActiveItem] = useState("ALL");

  const itemLabels = dataKeys.map((key) => config[key]?.label);

  const activeData =
    activeItem === "ALL"
      ? data
      : data.map((item) => {
          const newItem = { [xAxisKey]: item[xAxisKey] };
          newItem[activeItem] = item[activeItem];
          return newItem;
        });

  return (
    <Card>
      <CardHeader className="flex-row items-start space-y-0 pb-0">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Select value={activeItem} onValueChange={setActiveItem}>
          <SelectTrigger
            className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select item" />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-xl">
            <SelectItem value="ALL" className="rounded-lg [&_span]:flex">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-3 w-3 shrink-0 rounded-sm bg-gray-300" />
                All
              </div>
            </SelectItem>
            {itemLabels.map((label) => (
              <SelectItem
                key={label}
                value={label}
                className="rounded-lg [&_span]:flex"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="flex h-3 w-3 shrink-0 rounded-sm"
                    style={{
                      backgroundColor: config[label]?.color,
                    }}
                  />
                  {label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className={long && "aspect-auto h-[250px] w-full"}
          config={config}
        >
          <BarChart
            margin={{
              top: 20,
            }}
            accessibilityLayer
            data={activeData}
          >
            <CartesianGrid vertical={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value}
              width={35}
            />
            <XAxis
              dataKey={xAxisKey}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.split(":")[0]}
            />
            {activeItem !== "ALL" && (
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            )}
            <ChartTooltip
              wrapperStyle={{ zIndex: 1000 }}
              content={<ScrollableTooltipContent config={config} />}
            />
            {dataKeys
              .sort((a, b) => a.localeCompare(b))
              .map((key, index) => (
                <Bar
                  isAnimationActive={false}
                  key={key}
                  dataKey={key}
                  stackId="a"
                  fill={config[key].color}
                ></Bar>
              ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">{footer}</CardFooter>
    </Card>
  );
}
