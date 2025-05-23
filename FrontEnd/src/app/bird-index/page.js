"use client";

import ImageWithFallback from "@/components/ImageWithFallback";
import { AppSidebar } from "@/components/Nav/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { collection, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FIRESTORE_DB } from "../../../firebaseConfig";

export default function Page() {
  const [birdSpecies, setBirdSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const router = useRouter();

  useEffect(() => {
    setLoading(true);

    const fetchBirdData = async () => {
      try {
        const ref = doc(
          collection(FIRESTORE_DB, "all-time-aggregation"),
          "global"
        );

        const querySnapshot = await getDoc(ref);
        const aggregatedNameCount = {};

        const data = querySnapshot.data();
        const nameCountArray = data.species_count || [];

        setLastUpdated(
          data.timestamp ? new Date(data.timestamp.seconds * 1000) : null
        );

        nameCountArray.forEach((nameEntry) => {
          const { name, count } = nameEntry;
          if (aggregatedNameCount[name]) {
            aggregatedNameCount[name] += count;
          } else {
            aggregatedNameCount[name] = count;
          }
        });

        const speciesArray = Object.keys(aggregatedNameCount).map((name) => ({
          species: name,
          count: aggregatedNameCount[name],
        }));

        speciesArray.sort((a, b) => b.count - a.count);

        setBirdSpecies(speciesArray);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching bird data:", error);
        setLoading(false);
      }
    };

    fetchBirdData();
  }, []);

  const filteredBirds = birdSpecies.filter((bird) =>
    bird.species.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  <BreadcrumbPage>Bird Index</BreadcrumbPage>
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
            backgroundImage: `url('/Robin.jpg')`,
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
              Dundee Bird Index
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
              All the bird species detected by the network.
            </p>
          </div>
        </div>
        <div className="p-4 pt-6">
          <div className="w-full max-w-4xl mx-auto">
            <Card className="p-4">
              <div className="mb-4">
                <Input
                  placeholder="Search for a bird species..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>

              {loading ? (
                <div className="py-8 text-center">
                  <h2 className="text-lg font-semibold">Loading...</h2>
                  <p className="text-gray-500">
                    Please wait while we fetch the bird index data.
                  </p>
                </div>
              ) : filteredBirds.length > 0 ? (
                <Table>
                  <TableCaption>
                    {lastUpdated &&
                      `Last updated: ${lastUpdated.toLocaleDateString()} at ${lastUpdated.toLocaleTimeString()}`}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[5%] text-right">#</TableHead>
                      <TableHead className="w-[55%]">Bird Species</TableHead>
                      <TableHead className="text-right">
                        Detection Count
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBirds.map((bird, index) => (
                      <TableRow
                        onClick={() =>
                          router.push(`/map?species=${bird.species}#map`)
                        }
                        className="cursor-pointer"
                        key={bird.species}
                      >
                        <TableCell className="text-right">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium flex items-center gap-3">
                          <ImageWithFallback
                            src={`/BirdImages/${bird.species}.png`}
                            width={100}
                            height={100}
                            alt={bird.species}
                            className="w-10 h-10 rounded-full object-cover"
                            fallbackSrc="/BirdImages/placeholder-bird.jpg"
                          />
                          {bird.species}
                        </TableCell>
                        <TableCell className="text-right">
                          {bird.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center">
                  <h2 className="text-lg font-semibold">No birds found</h2>
                  <p className="text-gray-500">
                    {searchQuery
                      ? `No bird species matching "${searchQuery}" were found.`
                      : "No bird species have been detected yet."}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
