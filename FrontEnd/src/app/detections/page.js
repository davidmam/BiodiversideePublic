"use client";

import DetectionListing from "@/components/DetectionListing";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { FIRESTORE_DB } from "../../../firebaseConfig";

import { AppSidebar } from "@/components/Nav/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function NearbyScreen() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const q = query(
        collection(FIRESTORE_DB, "bird_detections"),
        orderBy("date", "desc"),
        orderBy("time", "desc"),
        limit(20)
      );

      const snapshot = await getDocs(q);

      const detections = snapshot.docs.map((doc) => doc.data());

      console.log(detections);

      setDetections(detections);
      setLoading(false);
    })();
  }, []);

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
                  <BreadcrumbPage>Recent Detections</BreadcrumbPage>
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
            backgroundImage: `url('/Black.jpg')`,

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
              Recent Detections
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
              Here you can view the 20 most recent bird detections, from all
              sites around Dundee.
            </p>
          </div>
        </div>
        <div className="p-4 pt-0">
          <div>
            <div
              style={{
                flex: 1,
              }}
            >
              {loading ? (
                <Card
                  className="mt-4"
                  style={{
                    padding: 20,

                    borderRadius: 10,
                  }}
                >
                  <h1
                    style={{
                      fontSize: 18,
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
                    Please wait while we fetch the latest detections.
                  </p>
                </Card>
              ) : (
                detections.map((detection) => (
                  <DetectionListing
                    key={detection.timestamp}
                    name={detection.name}
                    species={detection.species}
                    date={detection.date}
                    time={detection.time}
                    timestamp={detection.timestamp}
                    location={detection.id}
                    confidence={detection.score}
                    image={`/BirdImages/${detection.name}.png`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
