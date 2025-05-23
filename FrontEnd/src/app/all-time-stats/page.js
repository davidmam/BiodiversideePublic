"use client";

import { calculateShannonIndex, calculateSimpsonIndex } from "@/common";
import { MyInteractivePieChart } from "@/components/MyInteractivePieChart";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FIRESTORE_DB } from "../../../firebaseConfig";

export default function Page() {
  const [nameCount, setNameCount] = useState(null);
  const [locationNameCount, setLocationNameCount] = useState(null);
  const [hourlyAggregation, setHourlyAggregation] = useState(null);
  const [confidenceScoresByLocation, setConfidenceScoresByLocation] = useState(
    []
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [words, setWords] = useState(null);
  const [shannonIndex, setShannonIndex] = useState(null);
  const [simpsonIndex, setSimpsonIndex] = useState(null);

  useEffect(() => {
    setLoading(true);

    (async () => {
      try {
        const currentDate = new Date();
        const startDateTime = new Date(
          currentDate.getTime() - 24 * 60 * 60 * 1000
        );
        const endDateTime = currentDate;

        const q = query(
          collection(FIRESTORE_DB, "all-time-aggregation"),
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);

        const aggregatedNameCount = {};
        const aggregatedLocationNameCount = {};
        const hourlyAggregationArray = [];
        const locationConfidenceScores = {};
        const allConfidenceScores = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const nameCountArray = data.species_count || [];
          const locationNameCountArray = data.location_species_count || [];
          const { timestamp, species_count, location_score_stats } = data;

          const speciesCountObject = species_count.reduce(
            (acc, { name, count }) => {
              acc[name] = count;
              return acc;
            },
            {}
          );

          const timestampDate = new Date(timestamp.seconds * 1000);

          timestampDate.setHours(timestampDate.getHours() - 1);
          const hourlyEntry = {
            timestamp: timestampDate.toLocaleTimeString("en-GB", {
              hour: "numeric",
              minute: "numeric",
            }),
            ...speciesCountObject,
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

        setNameCount(nameCountArray);
        setShannonIndex(calculateShannonIndex(nameCountArray));
        setSimpsonIndex(calculateSimpsonIndex(nameCountArray));

        setWords(
          nameCountArray
            .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name))
            .map((entry) => ({
              text: entry.name,
              value: entry.count,
            }))
        );

        setLocationNameCount(locationNameCountArray);
        setHourlyAggregation(hourlyAggregationArray);
        setConfidenceScoresByLocation(aggregatedLocationConfidenceScores);
        setLastUpdated(
          querySnapshot.docs[querySnapshot.docs.length - 1]
            .data()
            .timestamp.toDate()
        );
        setLoading(false);

        console.log("Name Count for PieChart is: ", nameCountArray);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
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
                    <BreadcrumbPage>Home</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>

          <>
            <div
              className="flex"
              style={{
                backgroundBlendMode: "darken",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                backgroundImage: `url('/DashboardImage.jpeg')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                height: "30vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  color: "white",
                }}
              >
                <h1
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "bold",
                    color: "white",
                    textAlign: "center",
                  }}
                >
                  All Time Network Stats
                </h1>

                <p
                  style={{
                    color: "white",
                    textAlign: "center",
                    paddingRight: 20,
                    paddingLeft: 20,
                  }}
                  className="text-lg"
                >
                  The all time detection stats throughout the entire lifetime of
                  the Dundee Biodiversity Network.
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
              {loading ? (
                <Card
                  style={{
                    padding: 20,
                    marginBottom: 10,
                  }}
                >
                  <h1
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    Loading...
                  </h1>
                  <p
                    style={{
                      color: "grey",
                    }}
                  >
                    Please wait while we fetch the latest data.
                  </p>
                </Card>
              ) : (
                <>
                  {words && (
                    <div className="grid auto-rows-min gap-4 md:grid-cols-2">
                      {nameCount && lastUpdated && (
                        <MyInteractivePieChart
                          shorten
                          data={nameCount}
                          dataKey={"count"}
                          nameKey={"name"}
                          title={"All Time Bird Detections"}
                          description={
                            "Total number of bird species detections across all sites, throughout the entire lifetime of the network."
                          }
                          footer={
                            "Last updated: " +
                            lastUpdated.toLocaleString("en-GB", {
                              timeZone: "Europe/London",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                            }) +
                            " - New data is aggregated and updated every hour."
                          }
                        />
                      )}

                      {nameCount && (
                        <div className="md:col-span-1 flex flex-col">
                          <Card className="flex flex-col h-full">
                            <CardHeader className="flex-shrink-0">
                              <CardTitle>All Time Species Diversity</CardTitle>
                              <CardDescription>
                                Measures of all-time species biodiversity
                                throughout the entire lifetime of the network.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                              <div className="flex flex-row items-center h-full justify-evenly">
                                <div className="flex flex-col items-center">
                                  <p
                                    className="text-8xl font-bold "
                                    style={{
                                      color: "hsl(var(--chart-1))",
                                    }}
                                  >
                                    {nameCount.length}
                                  </p>
                                  <p
                                    style={{
                                      textAlign: "center",
                                      color: "grey",
                                    }}
                                  >
                                    Total Species Detected
                                  </p>
                                </div>

                                <div className="flex flex-col items-center">
                                  <div className="flex flex-col items-center">
                                    <p
                                      className="text-4xl font-bold"
                                      style={{
                                        color: "hsl(var(--chart-2))",
                                      }}
                                    >
                                      {shannonIndex.toFixed(4)}
                                    </p>
                                    <p
                                      style={{
                                        textAlign: "center",
                                        color: "grey",
                                      }}
                                    >
                                      <a
                                        href="https://en.wikipedia.org/wiki/Diversity_index#Shannon_index"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "hsl(var(--chart-2))",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        Shannon Index
                                      </a>
                                    </p>
                                  </div>

                                  <div className="flex flex-col items-center mt-6">
                                    <p
                                      className="text-4xl font-bold"
                                      style={{
                                        color: "hsl(var(--chart-2))",
                                      }}
                                    >
                                      {simpsonIndex.toFixed(4)}
                                    </p>
                                    <p
                                      style={{
                                        textAlign: "center",
                                        color: "grey",
                                      }}
                                    >
                                      <a
                                        href="https://en.wikipedia.org/wiki/Diversity_index#Simpson_index"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "hsl(var(--chart-2))",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        Simpson Index
                                      </a>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="flex-shrink-0">
                              <p>
                                Last updated:{" "}
                                {lastUpdated.toLocaleString("en-GB", {
                                  timeZone: "Europe/London",
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "numeric",
                                  minute: "numeric",
                                })}{" "}
                                - New data is aggregated and updated every hour.
                              </p>
                            </CardFooter>
                          </Card>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
