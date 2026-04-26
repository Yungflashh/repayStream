import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { BusinessSettingsPage } from "@/pages/BusinessSettingsPage";
import { ClaimPage } from "@/pages/ClaimPage";
import { CustomerPortalPage } from "@/pages/CustomerPortalPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DisputesPage } from "@/pages/DisputesPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PlanDetailPage } from "@/pages/PlanDetailPage";
import { PlanPage } from "@/pages/PlanPage";
import { RegisterPage } from "@/pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/plan/:id" element={<PlanPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/plan/:id" element={<PlanDetailPage />} />
        <Route path="/dashboard/disputes" element={<DisputesPage />} />
        <Route path="/settings/business" element={<BusinessSettingsPage />} />
        <Route path="/portal/claim" element={<ClaimPage />} />
        <Route path="/customer/:id" element={<CustomerPortalPage />} />
      </Route>
    </Routes>
  );
}
