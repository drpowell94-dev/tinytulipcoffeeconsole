import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import DashboardPage from "@/pages/DashboardPage";
import EventsPage from "@/pages/EventsPage";
import DrinkCounterPage from "@/pages/DrinkCounterPage";
import ContentPage from "@/pages/ContentPage";
import ChecklistsPage from "@/pages/ChecklistsPage";
import InventoryPage from "@/pages/InventoryPage";
import PropertiesPage from "@/pages/PropertiesPage";
import RevenuePage from "@/pages/RevenuePage";
import EmailCampaignsPage from "@/pages/EmailCampaignsPage";
import { syncBookingsFromWix } from "@/services/wixSyncService";
import { useAuth } from "@/hooks/useAuth";
import { isDemoMode } from "@/demo/demoMode";
import LoginGate from "@/components/auth/LoginGate";
import { TulipLogo } from "@/components/drinks/DrinkIcon";

export default function App() {
  const { status } = useAuth();

  useEffect(() => {
    // Wait for the shared team session before touching cloud data — once the
    // database requires auth, syncing any earlier would just fail silently.
    if (status !== "authed") return;

    // The `coffee` schema already holds the team's real data, so there's
    // nothing left to seed or migrate on boot (no more localStorage-first
    // hydrate, no venue/property seeding). The only remaining bootstrap work
    // is a best-effort pull of newly confirmed Wix bookings into events —
    // pages themselves now load their own data straight from Supabase.
    if (!isDemoMode) syncBookingsFromWix().catch(() => undefined);
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
