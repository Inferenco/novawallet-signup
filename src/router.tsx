import { createBrowserRouter, Navigate } from "react-router-dom";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { LandingPage } from "@/pages/LandingPage";
import { EventsPage } from "@/pages/EventsPage";
import { MyEventsPage } from "@/pages/MyEventsPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { appEnv } from "@/config/env";
import {
  CasinoPage,
  GamesHubPage,
  PokerCreatePage,
  PokerGameplayPage,
  PokerLandingPage,
  PokerTablesPage,
  SkillGamesPage,
  ThirdPartyGamesPage
} from "@/features/games/pages";
import { GamesMobileLayout } from "@/features/games/components/GamesMobileLayout";

export const router = createBrowserRouter(
  [
    {
      path: "/games",
      element: <GamesMobileLayout />,
      children: [
        { index: true, element: <GamesHubPage /> },
        { path: "skill-games", element: <SkillGamesPage /> },
        { path: "third-party", element: <ThirdPartyGamesPage /> },
        { path: "casino", element: <CasinoPage /> },
        { path: "poker", element: <PokerLandingPage /> },
        { path: "poker/tables", element: <PokerTablesPage /> },
        { path: "poker/create", element: <PokerCreatePage /> },
        { path: "poker/:tableAddress", element: <PokerGameplayPage /> }
      ]
    },
    {
      path: "/",
      element: <SiteLayout />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: "events", element: <EventsPage /> },
        { path: "my-events", element: <MyEventsPage /> },
        { path: "privacy", element: <PrivacyPage /> },
        { path: "*", element: <Navigate to="/" replace /> }
      ]
    }
  ],
  {
    basename: appEnv.basePath === "/" ? undefined : appEnv.basePath
  }
);
