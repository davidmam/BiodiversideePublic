"use client";

import {
  Binoculars,
  Bird,
  Database,
  Eye,
  House,
  Infinity,
  MapIcon,
} from "lucide-react";
import Image from "next/image";

import { NavMain } from "@/components/Nav/NavMain";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  explore: [
    {
      title: "Home",
      url: "/",
      icon: House,
    },
    {
      title: "Recent Detections",
      url: "/detections",
      icon: Eye,
    },
    {
      title: "Virtual Birdwatching",
      url: "/birdwatch",
      icon: Binoculars,
    },
  ],
  discover: [
    {
      title: "Map View",
      url: "/map",
      icon: MapIcon,
    },
    {
      title: "Bird Index",
      url: "/bird-index",
      icon: Bird,
    },
    {
      title: "All Time Stats",
      url: "/all-time-stats",
      icon: Infinity,
    },
  ],
  advanced: [
    {
      title: "Query the Data",
      url: "/data",
      icon: Database,
    },
  ],
};

export function AppSidebar({ ...props }) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-lime-600 text-sidebar-primary-foreground">
                  {/* <Leaf className="size-4" /> */}
                  <Image
                    src="/seedling-solid.svg"
                    alt="Logo"
                    width={50}
                    height={50}
                    className="h-4 w-4 "
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Biodiversi-Dee</span>
                  {/* <span className="truncate text-xs">Enterprise</span> */}
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={"Explore Recent Data"} items={data.explore} />
        <NavMain label={"Discover Insights"} items={data.discover} />
        <NavMain label={"Advanced"} items={data.advanced} />
        {/* <NavBees items={data.navBees} /> */}
      </SidebarContent>
      <SidebarFooter>{/* <NavUser user={data.user} /> */}</SidebarFooter>
    </Sidebar>
  );
}
