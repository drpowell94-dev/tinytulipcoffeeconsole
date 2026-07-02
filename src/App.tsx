import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import DashboardPage from "@/pages/DashboardPage";
import EventsPage from "@/pages/EventsPage";
import DrinkCounterPage from "@/pages/DrinkCounterPage";
import ContentPage from "@/pages/ContentPage";
import ChecklistsPage from "@/pages/ChecklistsPage";
import LogisticsPage from "@/pages/LogisticsPage";
import InventoryPage from "@/pages/InventoryPage";
import PropertiesPage from "@/pages/PropertiesPage";
import EmailCampaignsPage from "@/pages/EmailCampaignsPage";
import { loadProperties, clearProperties } from "@/lib/propertyStore";
import { seedVenues, migratePropertiesToVenues, purgeSampleVenues } from "@/lib/venueStore";
import { startCloudSync } from "@/services/cloudSync";
import { syncBookingsFromWix } from "@/services/wixSyncService";

export default function App() {
  useEffect(() => {
    (async () => {
      // Pull the team's shared data first (and subscribe to live changes), so a
      // new device picks up existing data instead of re-seeding its own copy.
      await startCloudSync();

      // Seed the venue address book, fold any legacy Properties entries into it,
      // then remove the old fake sample properties.
      seedVenues();
      migratePropertiesToVenues(loadProperties());
      purgeSampleVenues();
      clearProperties();

      // Pull confirmed bookings from Wix as events (replaces the old bundled
      // snapshot). Best-effort — ignore failures so the app still loads offline.
      syncBookingsFromWix()
        .catch(() => undefined)
        .finally(() => window.dispatchEvent(new CustomEvent("tt-sync", { detail: { key: "*" } })));

      // Nudge any mounted page to re-read after hydration.
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { key: "*" } }));
    })();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:eventId/counter" element={<DrinkCounterPage />} />
          <Route path="/content" element={<ContentPage />} />
          <Route path="/checklists" element={<ChecklistsPage />} />
          <Route path="/logistics" element={<Navigate to="/checklists" replace />} />
          <Route path="/email-campaigns" element={<EmailCampaignsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
