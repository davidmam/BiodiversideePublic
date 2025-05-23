export function calculateShannonIndex(speciesData) {
  const total = speciesData.reduce((sum, { count }) => sum + count, 0);
  return -speciesData
    .map(({ count }) => {
      const p = count / total;
      return p * Math.log(p);
    })
    .reduce((sum, value) => sum + value, 0);
}

// Simpson's Diversity Index
export function calculateSimpsonIndex(speciesData) {
  const total = speciesData.reduce((sum, { count }) => sum + count, 0);
  return (
    1 -
    speciesData
      .map(({ count }) => {
        const p = count / total;
        return p * p;
      })
      .reduce((sum, value) => sum + value, 0)
  );
}

export const colors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// function that returns a colours based on a given bird species name hash:
export function getColorBySpeciesName(name) {
  const hash = Array.from(name).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  const index = hash % colors.length;
  return colors[index];
}
