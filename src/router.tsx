import { createBrowserRouter, Navigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LandingPage } from "@/pages/LandingPage";
import { EventsPage } from "@/pages/EventsPage";
import { MyEventsPage } from "@/pages/MyEventsPage";
import { GamesPage } from "@/pages/GamesPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { appEnv } from "@/config/env";
import {
  CasinoPage,
  PokerCreatePage,
  PokerGameplayPage,
  PokerLandingPage,
  PokerTablesPage
} from "@/features/games/pages";

export const router = createBrowserRouter(
  [
    {
      path: "/games/poker/:tableAddress",
      element: <PokerGameplayPage />
    },
    {
      path: "/",
      element: <SiteLayout />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: "events", element: <EventsPage /> },
        { path: "my-events", element: <MyEventsPage /> },
        { path: "games", element: <GamesPage /> },
        { path: "games/casino", element: <CasinoPage /> },
        { path: "games/poker", element: <PokerLandingPage /> },
        { path: "games/poker/tables", element: <PokerTablesPage /> },
        { path: "games/poker/create", element: <PokerCreatePage /> },
        { path: "privacy", element: <PrivacyPage /> },
        { path: "*", element: <Navigate to="/" replace /> }
      ]
    }
  ],
  {
    basename: appEnv.basePath === "/" ? undefined : appEnv.basePath
  }
);
