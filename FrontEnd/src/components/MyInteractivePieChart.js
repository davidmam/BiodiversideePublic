"use client";
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
import * as React from "react";
import { Label, Pie, PieChart, Sector } from "recharts";

function formatNumberShort(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const assignColors = (dataLength, colors) => {
  const assignedColors = [];
  let previousColor = null;

  for (let i = 0; i < dataLength; i++) {
    const availableColors = colors.filter((color) => color !== previousColor);
    const color = availableColors[i % availableColors.length];
    assignedColors.push(color);
    previousColor = color;
  }

  return assignedColors;
};

export function MyInteractivePieChart({
  data,
  dataKey,
  nameKey,
  title = "Pie Chart - Interactive",
  description = "Interactive Chart",
  footer,
  subfooter,
}) {
  const id = "pie-interactive";

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => b[dataKey] - a[dataKey]);
  }, [data, dataKey]);

  const pieDataWithColors = React.useMemo(() => {
    const assignedColors = assignColors(sortedData.length, colors);
    return sortedData.map((item, index) => ({
      ...item,
      fill: assignedColors[index],
    }));
  }, [sortedData]);

  const dynamicConfig = React.useMemo(() => {
    return sortedData.reduce((config, item, index) => {
      const label = item[nameKey] || `Item ${index + 1}`;
      config[label] = {
        label,
        color: pieDataWithColors[index].fill,
      };
      return config;
    }, {});
  }, [sortedData, nameKey, pieDataWithColors]);

  const totalValue = React.useMemo(
    () => data.reduce((sum, item) => sum + item[dataKey], 0),
    [data, dataKey]
  );

  const [activeItem, setActiveItem] = React.useState("ALL");

  const activeIndex = React.useMemo(() => {
    if (activeItem === "ALL") return -1;
    return pieDataWithColors.findIndex((item) => item[nameKey] === activeItem);
  }, [activeItem, pieDataWithColors, nameKey]);

  const itemLabels = React.useMemo(
    () => sortedData.map((item) => item[nameKey]),
    [sortedData, nameKey]
  );

  React.useEffect(() => {
    if (
      sortedData.length > 0 &&
      !itemLabels.includes(activeItem) &&
      activeItem !== "ALL"
    ) {
      setActiveItem(sortedData[0][nameKey]);
    }
  }, [sortedData, activeItem, itemLabels, nameKey]);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No data available</CardTitle>
          <CardDescription>
            Please provide data to display the chart.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-chart={id} className="flex flex-col">
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
            {itemLabels.map((key) => {
              const config = dynamicConfig[key];

              if (!config) {
                return null;
              }

              return (
                <SelectItem
                  key={key}
                  value={key}
                  className="rounded-lg [&_span]:flex"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className="flex h-3 w-3 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: config.color,
                      }}
                    />
                    {config?.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-1 justify-center pb-0">
        <ChartContainer
          config={dynamicConfig}
          className="mx-auto aspect-square w-full max-w-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={pieDataWithColors}
              dataKey={dataKey}
              nameKey={nameKey}
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex >= 0 ? activeIndex : undefined}
              onMouseDown={(data, index) => {
                if (activeItem === data[nameKey]) {
                  setActiveItem("ALL");
                } else {
                  setActiveItem(data[nameKey]);
                }
              }}
              activeShape={({ outerRadius = 0, ...props }) => (
                <g>
                  <Sector {...props} outerRadius={outerRadius + 10} />
                  <Sector
                    {...props}
                    outerRadius={outerRadius + 25}
                    innerRadius={outerRadius + 12}
                  />
                </g>
              )}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        color="black"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy - 5}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {activeItem !== "ALL"
                            ? pieDataWithColors[activeIndex][dataKey] >=
                              1_000_000
                              ? `${(
                                  pieDataWithColors[activeIndex][dataKey] /
                                  1_000_000
                                ).toFixed(2)}M`
                              : pieDataWithColors[activeIndex][
                                  dataKey
                                ].toLocaleString()
                            : totalValue >= 1_000_000
                            ? `${(totalValue / 1_000_000).toFixed(2)}M`
                            : totalValue.toLocaleString()}
                        </tspan>

                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                          className="fill-muted-foreground"
                        >
                          {activeItem !== "ALL"
                            ? `${pieDataWithColors[activeIndex][nameKey]}`
                            : "Total Detections"}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2">{footer}</CardFooter>
    </Card>
  );
}
