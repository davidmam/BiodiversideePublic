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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

export function MyMultipleBarChart({
  title,
  description,
  footer,
  subfooter,
  data,
  xAxisKey,
  trend = 5.2,
}) {
  let dataKeys = [];
  for (const bar of data) {
    dataKeys = dataKeys.concat(
      Object.keys(bar).filter((key) => key !== xAxisKey)
    );
  }
  dataKeys = [...new Set(dataKeys)];

  const sortedData = data.map((entry) => {
    const speciesCounts = Object.keys(entry)
      .filter((key) => key !== xAxisKey)
      .map((species) => ({ species, count: entry[species] }));

    speciesCounts.sort((a, b) => b.count - a.count);

    const sortedEntry = {
      [xAxisKey]: entry[xAxisKey],
    };
    speciesCounts.forEach(({ species, count }) => {
      sortedEntry[species] = count;
    });

    return sortedEntry;
  });

  const orderedDataKeys = ["min", "avg", "max"];

  const config = orderedDataKeys.reduce((acc, key, index) => {
    acc[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[index % colors.length],
    };
    return acc;
  }, {});

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ChartContainer config={config}>
          <BarChart
            margin={{
              top: 10,
              bottom: 20,
            }}
            accessibilityLayer
            data={sortedData}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              allowDataOverflow={true}
              dataKey={xAxisKey}
              tickLine={false}
              tickMargin={20}
              axisLine={false}
              tickFormatter={(value) => {
                return value.length > 6 ? value.slice(0, 6) + "..." : value;
              }}
              angle={-75}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(2)}
              width={35}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            {orderedDataKeys.map((key, index) => (
              <Bar
                isAnimationActive={false}
                key={key}
                dataKey={key}
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
