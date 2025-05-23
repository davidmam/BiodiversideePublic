"use client";
import { MyAreaChart } from "@/components/AreaChart";
import { MyDatePicker } from "@/components/MyDatePicker";
import { MyMultiSelect } from "@/components/MyMultiSelect";
import { AppSidebar } from "@/components/Nav/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { FIRESTORE_DB } from "../../../firebaseConfig";

import { MyInteractivePieChart } from "@/components/MyInteractivePieChart";
import { Button } from "@/components/ui/button";
import { BirdIcon, Loader2, MapPin } from "lucide-react";

export default function Page() {
  const [runQuery, setRunQuery] = useState(false);
  const [nameCount, setNameCount] = useState(null);
  const [locationNameCount, setLocationNameCount] = useState(null);
  const [hourlyAggregation, setHourlyAggregation] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [confidenceScoresByLocation, setConfidenceScoresByLocation] = useState(
    []
  );
  const [birdNames, setBirdNames] = useState([]);
  const [selectedBirdNames, setSelectedBirdNames] = useState([]);

  const [locationNames, setLocationNames] = useState([]);
  const [selectedLocationNames, setSelectedLocationNames] = useState([]);
  const [locationSpeciesCount, setLocationSpeciesCount] = useState(null);

  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [words, setWords] = useState([]);

  function handleRunQuery() {
    setRunQuery((prev) => !prev);
  }

  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  currentDate.setDate(currentDate.getDate() - 1);
  currentDate.setHours(23, 59, 59, 999);

  const previousDate = new Date();
  previousDate.setHours(0, 0, 0, 0);
  previousDate.setDate(previousDate.getDate() - 30);

  const [dateRange, setDateRange] = useState({
    from: previousDate,
    to: currentDate,
  });

  useEffect(() => {
    setLoading(true);

    (async () => {
      try {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);

        fromDate.setUTCHours(0, 0, 0, 0);
        toDate.setUTCHours(23, 59, 59, 999);

        const q = query(
          collection(
            FIRESTORE_DB,
            dateRange.to - dateRange.from > 60 * 24 * 60 * 60 * 1000
              ? "weekly_aggregations"
              : "daily_aggregations"
          ),
          where("timestamp", ">=", fromDate),
          where("timestamp", "<=", toDate)
        );

        const querySnapshot = await getDocs(q);

        const aggregatedNameCount = {};
        const aggregatedLocationNameCount = {};
        const hourlyAggregationArray = [];
        const locationConfidenceScores = {};
        const allConfidenceScores = {};
        const locationSpeciesCount = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const nameCountArray = data.species_count || [];
          const locationNameCountArray = data.location_species_count || [];
          const {
            timestamp,
            species_count,
            location_score_stats,
            location_species_count,
          } = data;

          const speciesCountObject = species_count.reduce(
            (acc, { name, count }) => {
              acc[name] = count;
              return acc;
            },
            {}
          );

          const locations = location_species_count.map((locationEntry) => {
            const { location, ...speciesCounts } = locationEntry;
            return {
              location,
              counts: speciesCounts,
            };
          });

          const hourlyEntry = {
            timestamp: new Date(timestamp.seconds * 1000 - 24 * 60 * 60 * 1000),
            ...speciesCountObject,
            locations,
            shannon_index: data.shannon_index ?? null,
            simpson_index: data.simpson_index ?? null,
            location_diversity_stats: data.location_diversity_stats ?? null,
          };

          hourlyAggregationArray.push(hourlyEntry);

          nameCountArray.forEach((nameEntry) => {
            const { name, count } = nameEntry;
            if (aggregatedNameCount[name]) {
              aggregatedNameCount[name] += count;
            } else {
              aggregatedNameCount[name] = count;
            }
          });

          locationNameCountArray.forEach((locationEntry) => {
            const { location, ...nameCounts } = locationEntry;
            Object.entries(nameCounts).forEach(([name, count]) => {
              if (aggregatedNameCount[name]) {
                aggregatedNameCount[name] += count;
              } else {
                aggregatedNameCount[name] = count;
              }
            });

            if (!locationSpeciesCount[location]) {
              locationSpeciesCount[location] = [];
            }
            Object.entries(nameCounts).forEach(([name, count]) => {
              locationSpeciesCount[location].push({ name, count });
            });
          });

          locationNameCountArray.forEach((locationEntry) => {
            const { location, ...nameCounts } = locationEntry;
            if (!aggregatedLocationNameCount[location]) {
              aggregatedLocationNameCount[location] = {};
            }
            Object.keys(nameCounts).forEach((name) => {
              if (aggregatedLocationNameCount[location][name]) {
                aggregatedLocationNameCount[location][name] += nameCounts[name];
              } else {
                aggregatedLocationNameCount[location][name] = nameCounts[name];
              }
            });
          });

          if (location_score_stats) {
            Object.values(location_score_stats).forEach((scoreStats) => {
              const { location, avgScore, maxScore, minScore } = scoreStats;

              if (!allConfidenceScores[location]) {
                allConfidenceScores[location] = {
                  scores: [],
                  min: maxScore,
                  max: minScore,
                  totalAvgScore: 0,
                  count: 0,
                };
              }

              allConfidenceScores[location].scores.push(avgScore);
              allConfidenceScores[location].min = Math.min(
                allConfidenceScores[location].min,
                minScore
              );
              allConfidenceScores[location].max = Math.max(
                allConfidenceScores[location].max,
                maxScore
              );
              allConfidenceScores[location].totalAvgScore += avgScore;
              allConfidenceScores[location].count += 1;
            });
          }
        });

        const aggregatedLocationConfidenceScores = Object.keys(
          allConfidenceScores
        ).map((location) => {
          const { min, max, totalAvgScore, count } =
            allConfidenceScores[location];
          return {
            location,
            avg: totalAvgScore / count,
            min: min,
            max: max,
          };
        });

        const nameCountArray = Object.keys(aggregatedNameCount).map((name) => ({
          name,
          count: aggregatedNameCount[name],
        }));

        const locationNameCountArray = Object.keys(
          aggregatedLocationNameCount
        ).map((location) => ({
          location,
          ...aggregatedLocationNameCount[location],
        }));

        console.log("Location Species Count: ", locationSpeciesCount);
        console.log("Location Name Count Array: ", locationNameCountArray);
        console.log("Name Count Array: ", nameCountArray);

        setNameCount(nameCountArray);

        setBirdNames(
          nameCountArray.map((entry) => {
            return {
              value: entry.name,
              label: entry.name,
              icon: BirdIcon,
            };
          })
        );

        setLocationNames(
          locationNameCountArray.map((entry) => {
            return {
              value: entry.location,
              label: entry.location,
              icon: MapPin,
            };
          })
        );

        setHourlyAggregation(hourlyAggregationArray);
        setConfidenceScoresByLocation(aggregatedLocationConfidenceScores);
        setLastUpdated(
          querySnapshot.docs[querySnapshot.docs.length - 1]
            .data()
            .timestamp.toDate()
        );
        setLoading(false);

        console.log("Hourly Aggregation: ", hourlyAggregationArray);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    })();
  }, [runQuery]);

  const filteredAggregation = useMemo(() => {
    return hourlyAggregation
      ?.map((entry) => {
        const filteredEntry = {
          timestamp: new Date(entry.timestamp.getTime()),
        };

        const filterByBird = selectedBirdNames.length > 0;
        const filterByLocation = selectedLocationNames?.length > 0;
        const filterByDate = dateRange?.from && dateRange?.to;

        const timestamp = new Date(entry.timestamp);

        if (
          filterByDate &&
          (timestamp < dateRange.from || timestamp > dateRange.to)
        ) {
          return null;
        }

        const speciesCounts = {};

        const relevantLocations =
          entry.locations?.filter((locEntry) =>
            filterByLocation
              ? selectedLocationNames.includes(locEntry.location)
              : true
          ) || [];

        relevantLocations.forEach((locEntry) => {
          Object.entries(locEntry.counts).forEach(([birdName, count]) => {
            if (!filterByBird || selectedBirdNames.includes(birdName)) {
              speciesCounts[birdName] = (speciesCounts[birdName] || 0) + count;
            }
          });
        });

        Object.entries(speciesCounts).forEach(([birdName, count]) => {
          filteredEntry[birdName] = count;
        });

        return filteredEntry;
      })
      .filter((entry) => entry !== null);
  }, [hourlyAggregation, runQuery]);

  const diversityIndices = useMemo(() => {
    return (
      hourlyAggregation?.flatMap((entry) => {
        const filterByBird = selectedBirdNames.length > 0;
        const filterByLocation = selectedLocationNames?.length > 0;
        const filterByDate = dateRange?.from && dateRange?.to;

        const timestamp = new Date(entry.timestamp);

        if (
          filterByDate &&
          (timestamp < dateRange.from || timestamp > dateRange.to)
        ) {
          return [];
        }

        const relevantLocations =
          entry.location_diversity_stats?.filter((locEntry) =>
            filterByLocation
              ? selectedLocationNames.includes(locEntry.location)
              : true
          ) || [];

        return relevantLocations.map((locEntry) => {
          const speciesCounts = {};

          Object.entries(locEntry.counts || {}).forEach(([birdName, count]) => {
            if (!filterByBird || selectedBirdNames.includes(birdName)) {
              speciesCounts[birdName] = count;
            }
          });

          if (!filterByLocation) {
            return {
              timestamp,
              location: "All Locations",
              shannon_index: entry.shannon_index,
              simpson_index: entry.simpson_index,
            };
          }
          return {
            timestamp,
            location: locEntry.location,
            shannon_index: locEntry.shannon_index,
            simpson_index: locEntry.simpson_index,
          };
        });
      }) ?? []
    );
  }, [hourlyAggregation, runQuery]);

  const shannonIndexData = useMemo(() => {
    const grouped = {};

    diversityIndices.forEach((entry) => {
      if (entry.shannon_index == null) return;

      const timestampKey = new Date(entry.timestamp).toISOString();
      if (!grouped[timestampKey]) {
        grouped[timestampKey] = { timestamp: new Date(entry.timestamp) };
      }
      grouped[timestampKey][entry.location] = entry.shannon_index;
    });

    return Object.values(grouped);
  }, [diversityIndices]);

  const simpsonIndexData = useMemo(() => {
    const grouped = {};

    diversityIndices.forEach((entry) => {
      if (entry.simpson_index == null) return;

      const timestampKey = new Date(entry.timestamp).toISOString();
      if (!grouped[timestampKey]) {
        grouped[timestampKey] = { timestamp: new Date(entry.timestamp) };
      }
      grouped[timestampKey][entry.location] = entry.simpson_index;
    });

    return Object.values(grouped);
  }, [diversityIndices]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Query the Data</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div
          className="flex"
          style={{
            backgroundBlendMode: "darken",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backgroundImage: `url('/DivingSeagull.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center",

            height: "30vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div style={{ color: "white" }} className="p-4">
            <h1 className="text-4xl font-bold text-white text-center">
              Take a Deep Dive into the Data
            </h1>
            <p className="text-lg text-white text-center px-5">
              Here you can perform complex queries on the data to get insights.
              Choose your query and execute it to generate informative graphs
              and charts.
            </p>
          </div>
        </div>

        <div className="p-4 pt-0 mb-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3 pt-4">
            <Card>
              <CardHeader>
                <div className="grid gap-1">
                  <CardTitle>Time Period</CardTitle>
                  <CardDescription>
                    Choose a specific time period to filter the data.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <MyDatePicker
                  style={{
                    width: "100%",
                    marginBottom: 10,
                  }}
                  onChange={(date) => {
                    setDateRange({ ...dateRange, from: date });
                  }}
                  value={dateRange.from}
                  label="From"
                  placeholder="Start Date"
                />
                <MyDatePicker
                  style={{
                    width: "100%",
                  }}
                  onChange={(date) => {
                    setDateRange({ ...dateRange, to: date });
                  }}
                  value={dateRange.to}
                  label="To"
                  placeholder="End Date"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="grid gap-1">
                  <CardTitle>Filtering</CardTitle>
                  <CardDescription>
                    Filter the data by a range of properties.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div>
                  <MyMultiSelect
                    options={birdNames}
                    onValueChange={setSelectedBirdNames}
                    defaultValue={selectedBirdNames}
                    placeholder="Filter by Bird Name"
                    variant="inverted"
                    animation={2}
                    maxCount={3}
                    style={{
                      marginBottom: 10,
                    }}
                  />

                  <MyMultiSelect
                    options={locationNames}
                    onValueChange={setSelectedLocationNames}
                    defaultValue={selectedLocationNames}
                    placeholder="Filter by Site Location"
                    variant="inverted"
                    animation={2}
                    maxCount={3}
                  />
                </div>

                {/* <MyDateRangePicker /> */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="grid gap-1">
                  <CardTitle>Run the Query</CardTitle>
                  <CardDescription>
                    Execute the query to get the data.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    handleRunQuery();
                  }}
                  className="flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-center  [&_svg]:pointer-events-auto text-center"
                  style={{
                    width: "100%",
                    fontWeight: "bold",
                  }}
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <span>RUN</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex h-[250px] w-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {hourlyAggregation && lastUpdated && <div className="mt-4"></div>}

              <div className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Summary Statistics</CardTitle>
                    <CardDescription>
                      Overview of biodiversity metrics for the selected period
                      and locations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                        <span className="text-2xl font-bold">
                          {(() => {
                            const uniqueSpecies = new Set();
                            filteredAggregation?.forEach((entry) => {
                              Object.keys(entry).forEach((key) => {
                                if (key !== "timestamp" && entry[key] > 0) {
                                  uniqueSpecies.add(key.trim());
                                }
                              });
                            });
                            return uniqueSpecies.size;
                          })()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Unique Species
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                        <span className="text-2xl font-bold">
                          {(() => {
                            const shannonValues = diversityIndices
                              .filter((entry) => entry.shannon_index != null)
                              .map((entry) => entry.shannon_index);
                            return shannonValues.length > 0
                              ? (
                                  shannonValues.reduce((a, b) => a + b, 0) /
                                  shannonValues.length
                                ).toFixed(2)
                              : "N/A";
                          })()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Shannon Index
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                        <span className="text-2xl font-bold">
                          {(() => {
                            const simpsonValues = diversityIndices
                              .filter((entry) => entry.simpson_index != null)
                              .map((entry) => entry.simpson_index);
                            return simpsonValues.length > 0
                              ? (
                                  simpsonValues.reduce((a, b) => a + b, 0) /
                                  simpsonValues.length
                                ).toFixed(2)
                              : "N/A";
                          })()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Simpson Index
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-4">
                <MyInteractivePieChart
                  data={(() => {
                    const aggregatedCounts = {};

                    filteredAggregation?.forEach((entry) => {
                      Object.entries(entry).forEach(([key, value]) => {
                        if (key !== "timestamp") {
                          aggregatedCounts[key] =
                            (aggregatedCounts[key] || 0) + value;
                        }
                      });
                    });

                    return Object.entries(aggregatedCounts).map(
                      ([name, count]) => ({
                        name,
                        count,
                      })
                    );
                  })()}
                  dataKey={"count"}
                  nameKey={"name"}
                  title={"Bird Detections"}
                  description={
                    "Total number of each bird species detected in the selected time period."
                  }
                  footer={
                    "Last updated: " +
                    lastUpdated?.toLocaleString("en-GB", {
                      timeZone: "Europe/London",
                      hour: "numeric",
                      minute: "numeric",
                    }) +
                    " - New data is aggregated and updated every hour."
                  }
                />
              </div>

              <div className="mt-4">
                <MyAreaChart
                  title={`Bird Species Detections`}
                  description={`Bird Species Detections ${
                    dateRange.to - dateRange.from > 60 * 24 * 60 * 60 * 1000
                      ? "per week"
                      : "per day"
                  } from ${
                    (dateRange?.from &&
                      dateRange?.from?.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                      })) ||
                    "00:00"
                  } to ${
                    (dateRange?.to &&
                      dateRange?.to?.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                      })) ||
                    "23:59"
                  } (Line)
                    `}
                  data={filteredAggregation}
                  xAxisKey="timestamp"
                  type="Shannon"
                  footer={
                    "Last updated: " +
                    lastUpdated?.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })
                  }
                  subfooter={
                    "Querying uses long term data that is aggregated and updated every 24 hours."
                  }
                />
              </div>

              <div className="mt-4">
                <MyAreaChart
                  title="Total Bird Detections Over Time"
                  description="Total number of bird detections across all species for the selected time period."
                  data={filteredAggregation?.map((entry) => {
                    const totalDetections = Object.entries(entry)
                      .filter(([key]) => key !== "timestamp")
                      .reduce((sum, [_, count]) => sum + count, 0);

                    return {
                      timestamp: entry.timestamp,
                      "Total Detections": totalDetections,
                    };
                  })}
                  xAxisKey="timestamp"
                  type="Line"
                  footer={
                    "Last updated: " +
                    lastUpdated?.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })
                  }
                  subfooter={
                    "Querying uses long term data that is aggregated and updated every 24 hours."
                  }
                />
              </div>

              <div className="mt-4">
                <MyAreaChart
                  title="Shannon Index Over Time"
                  description="Shannon's Diversity Index is a measure of diversity in a community that accounts for both abundance and evenness of the species present."
                  data={shannonIndexData}
                  type="Shannon"
                  footer={
                    "Last updated: " +
                    lastUpdated?.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })
                  }
                  subfooter={
                    "Querying uses long term data that is aggregated and updated every 24 hours."
                  }
                />
              </div>

              <div className="mt-4">
                <MyAreaChart
                  title="Simpson Index Over Time"
                  description="Simpson's Diversity Index is a measure of diversity that takes into account the number of species present, as well as the abundance of each species."
                  data={simpsonIndexData}
                  type="Simpson"
                  footer={
                    "Last updated: " +
                    lastUpdated?.toLocaleString("en-GB", {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })
                  }
                  subfooter={
                    "Querying uses long term data that is aggregated and updated every 24 hours."
                  }
                />
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
