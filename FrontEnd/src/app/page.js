"use client";

import { calculateShannonIndex, calculateSimpsonIndex } from "@/common";
import BirdCloud from "@/components/BirdCloud";
import { HourlySpeciesGraph } from "@/components/HourlySpeciesGraph";
import { MyInteractivePieChart } from "@/components/MyInteractivePieChart";
import { MyStackedBarChart } from "@/components/MyStackedBarChart";
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
import { collection, getDocs, limit, query, where } from "firebase/firestore"; /** functions to retrieve from firestore. Need to add a db layer of functions in */
import { useEffect, useState } from "react";
import { FIRESTORE_DB } from "../../firebaseConfig"; /** need to move database specifics out of the top page code. */

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

  useEffect(() => { /** this is a Node.js thing that will update periodically when the page is changed. */
    setLoading(true);

    (async () => { /** this block should be a single function call to return the data structure. */
      try {
        const currentDate = new Date();
        const startDateTime = new Date(
          currentDate.getTime() - 24 * 60 * 60 * 1000
        );
        const endDateTime = currentDate;

        const q = query(
          collection(FIRESTORE_DB, "hourly_aggregations"),
          where("timestamp", ">=", startDateTime),
          where("timestamp", "<=", endDateTime),
          limit(24)
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

        /** the parts below should be in this function. The data structures used should be populated by a call to the db function for that table.` */
        setNameCount(nameCountArray); /** update the state of the data triggering a redraw of the components depending on it.  */
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
                  Biodiversi-Dee
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
                  Explore the biodiversity data collected by the Dundee
                  Biodiversity Network.
                </p>
              </div>
            </div>
            <div className="bg-lime-600 text-white text-center p-2 mb-3">
              <p>
                Help us improve! Give your feedback{" "}
                <a
                  href="https://forms.office.com/r/mt7VRDZWLp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  here
                </a>
                .
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
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
                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <BirdCloud words={words} />
                      </div>

                      {nameCount && lastUpdated && (
                        <MyInteractivePieChart
                          data={nameCount} /** gets loaded data */
                          dataKey={"count"}
                          nameKey={"name"}
                          title={"Bird Detections"}
                          description={
                            "Total number of each bird species detected in Dundee in the last 24 hours."
                          }
                          footer={
                            "Last updated: " +
                            lastUpdated.toLocaleString("en-GB", {
                              timeZone: "Europe/London",
                              hour: "numeric",
                              minute: "numeric",
                            }) +
                            " - New data is aggregated and updated every hour."
                          }
                        />
                      )}
                    </div>
                  )}

                  {/* <Card
                    style={{
                      width: "100%",
                      padding: 20,
                      display: "flex",
                      flex: 1,
                      justifyContent: "center",
                    }}
                  ></Card> */}
                  <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    {nameCount && (
                      <div className="md:col-span-1 flex flex-col">
                        <Card className="flex flex-col h-full">
                          <CardHeader className="flex-shrink-0">
                            <CardTitle>Biodiversity Indices</CardTitle>
                            <CardDescription>
                              Measures of species biodiversity in the Dundee
                              bird species detections in the last 24 hours.
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
                                  {nameCount.length} <!-- total number of species -->
                                </p>
                                <p
                                  style={{ textAlign: "center", color: "grey" }}
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
                                    {shannonIndex.toFixed(4)} <!-- Gets loaded data -->
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
                                    {simpsonIndex.toFixed(4)} <!-- Gets loaded data -->
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
                                hour: "numeric",
                                minute: "numeric",
                              })}{" "}
                              - New data is aggregated and updated every hour.
                            </p>
                          </CardFooter>
                        </Card>
                      </div>
                    )}

                    {locationNameCount && lastUpdated && (
                      <div className="md:col-span-2 flex flex-col">
                        <MyStackedBarChart
                          title="Bird Species Detected by Location"
                          description={
                            "Total number of each bird species, detected by each of the Dundee detection sites, in the last 24 hours."
                          }
                          footer={
                            "Last updated: " +
                            lastUpdated.toLocaleString("en-GB", {
                              hour: "numeric",
                              minute: "numeric",
                            }) +
                            " - New data is aggregated and updated every hour."
                          }
                          data={locationNameCount} /** gets loaded data */
                          xAxisKey="location"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
              {hourlyAggregation && lastUpdated && (
                <div>
                  <HourlySpeciesGraph
                    long
                    title="Hourly Bird Species Aggregation"
                    description={
                      "Species count for each hour in Dundee in the past 24 hours."
                    }
                    footer={
                      "Last updated: " +
                      lastUpdated.toLocaleString("en-GB", {
                        hour: "numeric",
                        minute: "numeric",
                      }) +
                      " - New data is aggregated and updated every hour."
                    }
                    data={hourlyAggregation} /** gets loaded data */
                    xAxisKey="timestamp"
                  />
                </div>
              )}
            </div>
          </>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
