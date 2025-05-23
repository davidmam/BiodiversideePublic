"use client";

import BirdWatchingBirdObject from "@/components/BirdWatchingBirdObject"; // The Bird component you created
import { AppSidebar } from "@/components/Nav/AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
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
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { FIRESTORE_DB } from "../../../firebaseConfig";

export default function Page() {
  const [birdQueue, setBirdQueue] = useState([]);

  const [location, setLocation] = useState("All Dundee");

  const [hideBirdLabels, setHideBirdLabels] = useState(false);
  const [hideBirdImages, setHideBirdImages] = useState(false);
  const [muteBirdSounds, setMuteBirdSounds] = useState(false);

  const getRandomPosition = () => {
    const padding = 200;
    const screenWidth = window.innerWidth - padding;
    const screenHeight = window.innerHeight - padding;

    const randomTop = Math.max(
      padding / 2,
      Math.min(
        screenHeight - 150,
        Math.floor(Math.random() * (screenHeight - 150)) + padding / 2
      )
    );
    const randomLeft = Math.max(
      padding / 2,
      Math.min(
        screenWidth - 150,
        Math.floor(Math.random() * (screenWidth - 150)) + padding / 2
      )
    );

    return { top: randomTop, left: randomLeft };
  };

  useEffect(() => {
    let birdQuery = query(
      collection(FIRESTORE_DB, "bird_detections"),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    if (location !== "All Dundee") {
      birdQuery = query(
        collection(FIRESTORE_DB, "bird_detections"),
        orderBy("timestamp", "desc"),
        limit(1),
        where("id", "==", location)
      );
    }

    const unsubscribe = onSnapshot(birdQuery, (snapshot) => {
      snapshot.forEach((doc) => {
        const birdData = doc.data();

        (async () => {
          if (!muteBirdSounds) {
            const response = await fetch(
              `https://biodiversidee-b5654.ew.r.appspot.com/api/bird-sound?birdName=${birdData.name}`
            );
            const data = await response.json();
            if (data.recordings && data.recordings.length > 0) {
              console.log("File:", data.recordings[0].file);

              const bird = {
                id: doc.id,
                name: birdData.name,
                image: `/BirdImages/${birdData.name}.png`,
                position: getRandomPosition(),
                audio:
                  data.recordings[
                    Math.floor(Math.random() * data.recordings.length)
                  ].file,
                audioLength: data.recordings[0].length,
              };
              setBirdQueue((prev) => [...prev, bird]);

              setTimeout(() => {
                setBirdQueue((prev) => prev.filter((b) => b.id !== bird.id));
              }, 8000);
            }
          } else {
            const bird = {
              id: doc.id,
              name: birdData.name,
              image: `/BirdImages/${birdData.name}.png`,
              position: getRandomPosition(),
              audio: null,
              audioLength: 0,
            };

            setBirdQueue((prev) => [...prev, bird]);

            setTimeout(() => {
              setBirdQueue((prev) => prev.filter((b) => b.id !== bird.id));
            }, 10000);
          }
        })();
      });
    });

    return () => unsubscribe();
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
                  <BreadcrumbPage>Virtual Bird Watching</BreadcrumbPage>
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
            backgroundImage: `url('/BlueTit.jpg')`,
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
              Virtual Birdwatching
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
              Here you can see in real-time the latest bird detections in
              Dundee. Birdwatching takes time and patience, so sit back and
              relax while you wait for the next bird to appear.
            </p>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Virtual Birdwatching</CardTitle>
                <CardDescription>
                  Simply scroll down to the birdwatching area and wait for a
                  bird to appear. You can mute the bird sounds if you prefer a
                  quieter experience.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    window.location.href = "#birdwatching";
                  }}
                  style={{ width: "100%", fontWeight: "bold" }}
                >
                  Begin Birdwatching
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Birdwatching Options</CardTitle>
                <CardDescription>
                  Here you can toggle the bird labels and images on/off to give
                  yourself a challenge and teach you to identify birds by their
                  sounds/images.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="hideLabels"
                    type="checkbox"
                    checked={hideBirdLabels}
                    onChange={(e) => setHideBirdLabels(e.target.checked)}
                  />
                  <label htmlFor="hideLabels" className="cursor-pointer">
                    Hide Bird Label (click bird to reveal)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="hideImages"
                    type="checkbox"
                    checked={hideBirdImages}
                    onChange={(e) => setHideBirdImages(e.target.checked)}
                  />
                  <label htmlFor="hideImages" className="cursor-pointer">
                    Hide Bird Image (click bird to reveal)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="muteBirdSounds"
                    type="checkbox"
                    checked={muteBirdSounds}
                    onChange={(e) => setMuteBirdSounds(e.target.checked)}
                  />
                  <label htmlFor="muteBirdSounds" className="cursor-pointer">
                    Mute Bird Sounds?
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card id="birdwatching">
            <div
              style={{
                borderRadius: 10,
              }}
              className="birdwatching-container"
            >
              <AnimatePresence>
                {birdQueue.map((bird) => (
                  <BirdWatchingBirdObject
                    key={bird.id}
                    bird={bird}
                    hideLabel={hideBirdLabels}
                    hideImage={hideBirdImages}
                    muteBirdSounds={muteBirdSounds}
                    style={{
                      position: "absolute",
                      top: bird.position.top,
                      left: bird.position.left,
                      transition: "all 0.5s ease",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    onRemove={() =>
                      setBirdQueue((prev) =>
                        prev.filter((b) => b.id !== bird.id)
                      )
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
