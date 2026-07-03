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
import RevenuePage from "@/pages/RevenuePage";
import EmailCampaignsPage from "@/pages/EmailCampaignsPage";
import { loadProperties, clearProperties } from "@/lib/propertyStore";
import { loadEvents } from "@/lib/eventStore";
import { importBundledWixEvents } from "@/services/eventService";
import { seedVenues, migratePropertiesToVenues, purgeSampleVenues } from "@/lib/venueStore";
import { startCloudSync } from "@/services/cloudSync";
import { syncBookingsFromWix } from "@/services/wixSyncService";
import { useAuth } from "@/hooks/useAuth";
import LoginGate from "@/components/auth/LoginGate";
import { TulipLogo } from "@/components/drinks/DrinkIcon";

export default function App() {
  const { status } = useAuth();

  useEffect(() => {
    // Wait for the shared team session before touching cloud data — once the
    // database requires auth, syncing any earlier would just fail silently.
    if (status !== "authed") return;
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

      // Guarantee a baseline of events even if the Wix booking sync fails or
      // returns nothing (e.g. the key can't read Bookings yet).
      if (loadEvents().length === 0) {
        importBundledWixEvents();
        window.dispatchEvent(new CustomEvent("tt-sync", { detail: { key: "tt-events" } }));
      }

      // Pull confirmed bookings from Wix as events (replaces the old bundled
      // snapshot). Best-effort — ignore failures so the app still loads offline.
      syncBookingsFromWix()
        .catch(() => undefined)
        .finally(() => window.dispatchEvent(new CustomEvent("tt-sync", { detail: { key: "*" } })));

      // Nudge any mounted page to re-read after hydration.
      window.dispatchEvent(new CustomEvent("tt-sync", { detail: { key: "*" } }));
    })();
  }, [status]);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <TulipLogo size={48} className="animate-pulse" />
      </div>
    );
  }

  if (status === "anon") {
    return <LoginGate />;
  }

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
          <Route path="/revenue" element={<RevenuePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
