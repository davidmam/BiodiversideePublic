import { colors } from "@/common";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParentSize } from "@visx/responsive";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";

function fontSizeSetter(words, datum) {
  const isMobile = window.innerWidth <= 768;
  const minFontSize = isMobile ? 1 : 4;
  const maxFontSize = isMobile ? 32 : 48;

  const fontScale = scaleLog({
    domain: [
      Math.min(...words.map((w) => w.value)),
      Math.max(...words.map((w) => w.value)),
    ],
    range: [minFontSize, maxFontSize],
  });

  return fontScale(datum.value);
}

export default function BirdCloud({ words }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>
          <span
            style={{
              textDecoration: "line-through",
              textDecorationColor: "hsl(var(--chart-1))",
              textDecorationThickness: 2,
            }}
          >
            Wordcloud
          </span>
          <span> Birdcloud</span>
        </CardTitle>
        <CardDescription>
          A visual representation of the most frequently detected bird species
          in Dundee within the last 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent
        style={{
          flexGrow: 1,
          width: "100%",
          minHeight: "50vh",
        }}
      >
        <ParentSize>
          {({ width, height }) => (
            <Wordcloud
              words={words.map((entry) => ({
                text: entry.text,
                value: entry.value,
              }))}
              width={width}
              height={height}
              fontSize={(word) => fontSizeSetter(words, word)}
              font={"Impact"}
              padding={2}
              spiral={"rectangular"}
              rotate={0}
            >
              {(cloudWords) =>
                cloudWords.map((w, i) => (
                  <Text
                    key={w.text}
                    fill={colors[i % colors.length]}
                    textAnchor={"middle"}
                    transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
                    fontSize={w.size}
                    fontFamily={w.font}
                  >
                    {w.text}
                  </Text>
                ))
              }
            </Wordcloud>
          )}
        </ParentSize>
      </CardContent>
    </Card>
  );
}
