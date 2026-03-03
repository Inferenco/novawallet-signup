import { createBrowserRouter, Navigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LandingPage } from "@/pages/LandingPage";
import { EventsPage } from "@/pages/EventsPage";
import { MyEventsPage } from "@/pages/MyEventsPage";
import { GamesPage } from "@/pages/GamesPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { appEnv } from "@/config/env";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <SiteLayout />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: "events", element: <EventsPage /> },
        { path: "my-events", element: <MyEventsPage /> },
        { path: "games", element: <GamesPage /> },
        { path: "privacy", element: <PrivacyPage /> },
        { path: "*", element: <Navigate to="/" replace /> }
      ]
    }
  ],
  {
    basename: appEnv.basePath === "/" ? undefined : appEnv.basePath
  }
);
