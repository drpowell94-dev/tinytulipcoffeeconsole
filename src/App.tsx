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
import EmailCampaignsPage from "@/pages/EmailCampaignsPage";
import { importBundledWixEvents } from "@/services/eventService";
import { seedCharlotteProperties } from "@/lib/seedData";

export default function App() {
  useEffect(() => {
    seedCharlotteProperties();

    const initialized = localStorage.getItem("tt-bundled-events-imported");
    if (!initialized) {
      const { created, updated } = importBundledWixEvents();
      if (created > 0 || updated > 0) {
        localStorage.setItem("tt-bundled-events-imported", "true");
      }
    }
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
          <Route path="/email-campaigns" element={<EmailCampaignsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
