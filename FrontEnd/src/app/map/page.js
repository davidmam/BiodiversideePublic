"use client";

import BirdHeatmap from "@/components/BirdHeatmap";
import { AppSidebar } from "@/components/Nav/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map,
} from "@vis.gl/react-google-maps";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FIRESTORE_DB } from "../../../firebaseConfig";

const LOCATION_COORDINATES = {
  "Step Row": { lat: 56.4546, lng: -2.991409 },
  DJCAD: { lat: 56.4565, lng: -2.9836 },
  BroughtyFerry: { lat: 56.4693, lng: -2.8813 },
  CityQuay: { lat: 56.4622, lng: -2.9607 },
  Ninewells: { lat: 56.4632, lng: -3.0386 },
  Botanics: { lat: 56.4555, lng: -3.0213 },
  Maxwelltown: { lat: 56.4701, lng: -2.9705 },
  Aberdour: { lat: 56.0545, lng: -3.299 },
  Charleston: { lat: 56.4748, lng: -3.0406 },
  Friary: { lat: 56.4657, lng: -2.9995 },
  Meigle: { lat: 56.5882, lng: -3.1626 },
  Eastfield: { lat: 56.5222, lng: -3.0751 },
  LogieStreet: { lat: 56.4686, lng: -3.0033 },
  JHI: { lat: 56.457, lng: -3.069 },
  default: { lat: 56.462, lng: -2.9707 },
};

const getCoordinates = (location) => {
  return LOCATION_COORDINATES[location] || LOCATION_COORDINATES["default"];
};

const SPECIES_COLORS = {
  Robin: "#e63946",
  Sparrow: "#a8dadc",
  Blackbird: "#1d3557",
  Magpie: "#457b9d",
  "Blue Tit": "#48cae4",
  "Wood Pigeon": "#6d597a",
  Goldfinch: "#f9c74f",
  Starling: "#4a4e69",
  Chaffinch: "#f28482",
  "Great Tit": "#588157",
  default: "#22c55e",
};

const getSpeciesColor = (species) => {
  return SPECIES_COLORS[species] || SPECIES_COLORS["default"];
};

const fetchDataForTimeFilter = async (timeFilter) => {
  const now = new Date();
  let collectionName = "all-time-aggregation";
  let queryConstraints = [];

  switch (timeFilter) {
    case "day":
      collectionName = "hourly_aggregations";
      const last24Hours = new Date(now);
      last24Hours.setHours(last24Hours.getHours() - 24);
      queryConstraints = [
        where("timestamp", ">=", last24Hours),
        where("timestamp", "<=", now),
        orderBy("timestamp", "desc"),
      ];
      break;
    case "week":
      collectionName = "daily_aggregations";
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      queryConstraints = [
        where("timestamp", ">=", lastWeek),
        where("timestamp", "<=", now),
        orderBy("timestamp", "desc"),
        limit(7),
      ];
      break;
    case "month":
      collectionName = "daily_aggregations";
      const lastMonth = new Date(now);
      lastMonth.setDate(lastMonth.getDate() - 30);
      queryConstraints = [
        where("timestamp", ">=", lastMonth),
        where("timestamp", "<=", now),
        orderBy("timestamp", "desc"),
        limit(30),
      ];
      break;
    default:
      queryConstraints = [limit(1)];
      break;
  }

  const q = query(
    collection(FIRESTORE_DB, collectionName),
    ...queryConstraints
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  if (collectionName === "all-time-aggregation") {
    return querySnapshot.docs[0].data();
  }

  if (collectionName === "hourly_aggregations") {
    const aggregatedData = {
      species_count: [],
      location_species_count: [],
      timestamp: now,
    };

    const speciesCountMap = {};
    const locationSpeciesMap = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      data.species_count.forEach(({ name, count }) => {
        speciesCountMap[name] = (speciesCountMap[name] || 0) + count;
      });

      data.location_species_count.forEach(({ location, ...speciesCounts }) => {
        if (!locationSpeciesMap[location]) {
          locationSpeciesMap[location] = {};
        }
        Object.entries(speciesCounts).forEach(([species, count]) => {
          locationSpeciesMap[location][species] =
            (locationSpeciesMap[location][species] || 0) + count;
        });
      });
    });

    aggregatedData.species_count = Object.entries(speciesCountMap).map(
      ([name, count]) => ({
        name,
        count,
      })
    );

    aggregatedData.location_species_count = Object.entries(
      locationSpeciesMap
    ).map(([location, speciesCounts]) => ({
      location,
      ...speciesCounts,
    }));

    return aggregatedData;
  }

  if (collectionName === "daily_aggregations") {
    const aggregatedData = {
      species_count: [],
      location_species_count: [],
      timestamp: now,
    };

    const speciesCountMap = {};
    const locationSpeciesMap = {};

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      data.species_count.forEach(({ name, count }) => {
        speciesCountMap[name] = (speciesCountMap[name] || 0) + count;
      });

      data.location_species_count.forEach(({ location, ...speciesCounts }) => {
        if (!locationSpeciesMap[location]) {
          locationSpeciesMap[location] = {};
        }
        Object.entries(speciesCounts).forEach(([species, count]) => {
          locationSpeciesMap[location][species] =
            (locationSpeciesMap[location][species] || 0) + count;
        });
      });
    });

    aggregatedData.species_count = Object.entries(speciesCountMap).map(
      ([name, count]) => ({
        name,
        count,
      })
    );

    aggregatedData.location_species_count = Object.entries(
      locationSpeciesMap
    ).map(([location, speciesCounts]) => ({
      location,
      ...speciesCounts,
    }));

    return aggregatedData;
  }

  return querySnapshot.docs[0].data();
};

export default function BirdMapPage() {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [birdSpeciesList, setBirdSpeciesList] = useState([]);
  const [birdNames, setBirdNames] = useState([]);
  const [locationNames, setLocationNames] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [detections, setDetections] = useState([]);
  const [nameCount, setNameCount] = useState([]);
  const [hourlyAggregation, setHourlyAggregation] = useState([]);
  const [confidenceScoresByLocation, setConfidenceScoresByLocation] = useState(
    []
  );
  const [selectedMarker, setSelectedMarker] = useState({});
  const [locationSpeciesCount, setLocationSpeciesCount] = useState({});
  const [aggregatedLocationNameCount, setAggregatedLocationNameCount] =
    useState({});

  const searchParams = useSearchParams();

  useEffect(() => {
    const speciesFromUrl = searchParams.get("species");
    if (speciesFromUrl) {
      setSelectedSpecies(speciesFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const filterMarkers = () => {
      if (
        !aggregatedLocationNameCount ||
        Object.keys(aggregatedLocationNameCount).length === 0
      ) {
        return [];
      }

      let newMarkers = [];

      Object.entries(aggregatedLocationNameCount).forEach(
        ([location, speciesData]) => {
          if (selectedLocation !== "all" && location !== selectedLocation) {
            return;
          }

          const coordinates = getCoordinates(location);

          if (selectedSpecies !== "all") {
            if (speciesData[selectedSpecies]) {
              newMarkers.push({
                latLng: coordinates,
                location,
                name: selectedSpecies,
                count: speciesData[selectedSpecies],
                color: getSpeciesColor(selectedSpecies),
              });
            }
          } else {
            Object.entries(speciesData).forEach(([species, count]) => {
              newMarkers.push({
                latLng: coordinates,
                location,
                name: species,
                count: count,
                color: getSpeciesColor(species),
              });
            });
          }
        }
      );

      if (timeFilter !== "all") {
      }

      return newMarkers;
    };

    const updatedMarkers = filterMarkers();

    if (updatedMarkers.length > 0) {
      const newDetections = updatedMarkers.map((marker) => ({
        location: marker.location,
        name: marker.name,
        date: "All time",
        time: "",
        score: 0.85,
        count: marker.count,
      }));
      setDetections(newDetections);
    }
  }, [
    selectedSpecies,
    selectedLocation,
    timeFilter,
    aggregatedLocationNameCount,
  ]);

  useEffect(() => {
    const filterMarkers = () => {
      if (
        !aggregatedLocationNameCount ||
        Object.keys(aggregatedLocationNameCount).length === 0
      ) {
        return [];
      }

      const newMarkers = [];

      Object.entries(aggregatedLocationNameCount).forEach(
        ([location, speciesData]) => {
          if (selectedLocation !== "all" && location !== selectedLocation) {
            return;
          }

          const coordinates = getCoordinates(location);
          let totalCount = 0;

          if (selectedSpecies === "all") {
            totalCount = Object.values(speciesData).reduce(
              (sum, count) => sum + count,
              0
            );
          } else {
            totalCount = speciesData[selectedSpecies] || 0;
          }

          if (totalCount > 0) {
            newMarkers.push({
              latLng: coordinates,
              location,
              name: selectedSpecies === "all" ? "All Species" : selectedSpecies,
              count: totalCount,
              color:
                selectedSpecies === "all"
                  ? "#3B82F6"
                  : getSpeciesColor(selectedSpecies),
            });
          }
        }
      );

      return newMarkers;
    };

    const updatedMarkers = filterMarkers();
    setMarkers(updatedMarkers);
  }, [
    selectedSpecies,
    selectedLocation,
    timeFilter,
    aggregatedLocationNameCount,
  ]);

  useEffect(() => {
    setLoading(true);

    (async () => {
      try {
        const data = await fetchDataForTimeFilter(timeFilter);

        if (!data) {
          setLoading(false);
          return;
        }

        const aggregatedNameCount = {};
        const aggregatedLocationNameCount = {};
        const locationSpeciesCount = {};
        const uniqueLocations = new Set();

        data.species_count.forEach(({ name, count }) => {
          aggregatedNameCount[name] = count;
        });

        data.location_species_count.forEach(
          ({ location, ...speciesCounts }) => {
            uniqueLocations.add(location);
            aggregatedLocationNameCount[location] = speciesCounts;

            if (!locationSpeciesCount[location]) {
              locationSpeciesCount[location] = [];
            }
            Object.entries(speciesCounts).forEach(([name, count]) => {
              locationSpeciesCount[location].push({ name, count });
            });
          }
        );

        setNameCount(
          Object.entries(aggregatedNameCount).map(([name, count]) => ({
            name,
            count,
          }))
        );
        setLocationSpeciesCount(locationSpeciesCount);
        setAggregatedLocationNameCount(aggregatedLocationNameCount);
        setBirdSpeciesList(Object.keys(aggregatedNameCount));
        setLocationNames(
          Array.from(uniqueLocations).map((location) => ({
            value: location,
            label: location,
            icon: "MapPin",
          }))
        );

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    })();
  }, [timeFilter]);

  const detectionsByLocation = detections.reduce((acc, detection) => {
    if (!acc[detection.location]) acc[detection.location] = [];
    acc[detection.location].push(detection);
    return acc;
  }, {});

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
  };

  const handleInfoWindowClose = () => {
    setSelectedMarker(null);
  };

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
                  <BreadcrumbPage>Bird Detection Map</BreadcrumbPage>
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
            backgroundImage: `url('/Red.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundPositionY: "center",
            height: "30vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div style={{ color: "white" }}>
            <h1 className="text-4xl font-bold text-white text-center">
              Map View
            </h1>
            <p className="text-lg text-white text-center px-5">
              Explore where birds have been detected across Dundee. Filter by
              species, location, or time period to narrow down your search.
            </p>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="species-select">Filter by Bird Species</Label>
              <Select
                value={selectedSpecies}
                onValueChange={setSelectedSpecies}
              >
                <SelectTrigger id="species-select">
                  <SelectValue placeholder="Select a bird species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  {birdSpeciesList.map((species) => (
                    <SelectItem key={species} value={species}>
                      {species}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location-select">Filter by Location</Label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
              >
                <SelectTrigger id="location-select">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locationNames.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time-select">Filter by Time Period</Label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger id="time-select">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="day">Past Day</SelectItem>
                  <SelectItem value="week">Past Week</SelectItem>
                  <SelectItem value="month">Past Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="heatmap-toggle"
                checked={showHeatmap}
                onCheckedChange={setShowHeatmap}
              />
              <Label htmlFor="heatmap-toggle">Show as Heatmap</Label>
            </div>
          </div>

          <Tabs defaultValue="map" className="w-full">
            <TabsList>
              <TabsTrigger value="map">Map View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>

            {/* Map View */}
            <TabsContent value="map" className="mt-4">
              <Card id="map" className="p-0 overflow-hidden h-[600px]">
                {loading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <p>Loading map data...</p>
                  </div>
                ) : (
                  <APIProvider
                    apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                  >
                    <Map
                      style={{ width: "100%", height: "100%" }}
                      defaultCenter={{ lat: 56.462, lng: -2.9707 }}
                      defaultZoom={12}
                      gestureHandling="greedy"
                      mapId={"f0a1c3b2d4e5f6g7"}
                      disableDefaultUI
                    >
                      {showHeatmap ? (
                        <BirdHeatmap
                          markers={markers}
                          radius={50}
                          opacity={0.7}
                        />
                      ) : (
                        markers.map((marker, index) => (
                          <AdvancedMarker
                            key={index}
                            position={marker.latLng}
                            title={`${marker.location}: ${marker.count} detections`}
                            onClick={() => handleMarkerClick(marker)}
                          >
                            <CustomPin
                              backgroundImage={
                                selectedSpecies !== "all"
                                  ? `url('/BirdImages/${selectedSpecies}.png')`
                                  : null
                              }
                              count={marker.count}
                            />
                          </AdvancedMarker>
                        ))
                      )}

                      {selectedMarker && !showHeatmap && (
                        <InfoWindow
                          position={selectedMarker.latLng}
                          onCloseClick={handleInfoWindowClose}
                        >
                          <div className="p-2 pt-0 mx-auto">
                            <div className="flex justify-center mb-2">
                              {" "}
                              {/* Center the image using flex */}
                              {selectedSpecies !== "all" && (
                                <Image
                                  src={`/BirdImages/${selectedMarker.name}.png`}
                                  alt={selectedMarker.name}
                                  width={100}
                                  height={100}
                                  className="rounded-lg aspect-square"
                                />
                              )}
                            </div>
                            <h3 className="font-bold">{selectedMarker.name}</h3>
                            <p>Location: {selectedMarker.location}</p>
                            <p>Detections: {selectedMarker.count}</p>
                          </div>
                        </InfoWindow>
                      )}
                    </Map>
                  </APIProvider>
                )}
              </Card>
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="mt-4">
              <Card className="p-4">
                {loading ? (
                  <p>Loading detection data...</p>
                ) : detections.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(detectionsByLocation).map(
                      ([location, detections]) => {
                        const sortedDetections = [...detections].sort(
                          (a, b) => b.count - a.count
                        );
                        return (
                          <div
                            key={location}
                            className="border-b pb-4 last:border-b-0"
                          >
                            <h3 className="text-lg font-bold mb-2">
                              Location: {location}
                              <span style={{ color: "grey" }}>
                                {" "}
                                (
                                {sortedDetections.reduce(
                                  (sum, d) => sum + d.count,
                                  0
                                )}{" "}
                                detections)
                              </span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {sortedDetections.map((detection, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md"
                                >
                                  <img
                                    src={`/BirdImages/${detection.name}.png`}
                                    alt={detection.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src =
                                        "/BirdImages/placeholder-bird.jpg";
                                    }}
                                  />
                                  <div>
                                    <h4 className="font-medium">
                                      {detection.name}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm text-gray-500">
                                        {detection.count} detections
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="text-center py-8">
                    No detections found for the selected filters.
                  </p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

const formatCount = (num) => {
  if (num >= 1_000_000_000)
    return (num / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (num >= 1_000_000)
    return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2).replace(/\.?0+$/, "") + "K";
  return num.toString();
};

const CustomPin = ({ count, backgroundImage }) => {
  return (
    <div
      style={{
        backgroundImage: backgroundImage ? backgroundImage : "none",
        backgroundBlendMode: "overlay",
        backgroundColor: backgroundImage ? "rgba(0, 0, 0, 0.3)" : "#3B82F6",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className="p-3 aspect-square flex items-center justify-center rounded-full shadow-lg text-white text-lg"
    >
      <span className="font-bold text-sm">{formatCount(count)}</span>
    </div>
  );
};
