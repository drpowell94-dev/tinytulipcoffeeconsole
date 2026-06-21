import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "@/components/layout/MainLayout";
import DashboardPage from "@/pages/DashboardPage";
import EventsPage from "@/pages/EventsPage";
import DrinkCounterPage from "@/pages/DrinkCounterPage";
import ContentPage from "@/pages/ContentPage";
import InventoryPage from "@/pages/InventoryPage";
import EmailCampaignsPage from "@/pages/EmailCampaignsPage";
import PropertiesPage from "@/pages/PropertiesPage";
import { seedCharlotteProperties } from "@/lib/seedData";

export default function App() {
  useEffect(() => {
    seedCharlotteProperties();
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
          <Route path="/email-campaigns" element={<EmailCampaignsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}
