import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AcceptableUsePage } from "@/pages/AcceptableUsePage";
import { BusinessSettingsPage } from "@/pages/BusinessSettingsPage";
import { ClaimPage } from "@/pages/ClaimPage";
import { CompliancePage } from "@/pages/CompliancePage";
import { ContactPage } from "@/pages/ContactPage";
import { CustomerPortalPage } from "@/pages/CustomerPortalPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DisputesPage } from "@/pages/DisputesPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PlanDetailPage } from "@/pages/PlanDetailPage";
import { PlanPage } from "@/pages/PlanPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { TermsPage } from "@/pages/TermsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/plan/:id" element={<PlanPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/acceptable-use" element={<AcceptableUsePage />} />
      <Route path="/compliance" element={<CompliancePage />} />
      <Route path="/contact" element={<ContactPage />} />

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
