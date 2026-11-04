import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import Index from "./pages/Index";
import CamerasPage from "./pages/CamerasPage";
import DetectionPage from "./pages/DetectionPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import FingerprintMatchingPage from "./pages/FingerprintMatchingPage";
import SimulationPage from "./pages/SimulationPage";
import NotFound from "./pages/NotFound";
import AssignedDetections from "./pages/AssignedDetections";
import AdminDashboard from "./pages/admin/AdminDashboard";
import MainDashboard from "./pages/admin/MainDashboard";
import { DetectionsAnalytics, UsersAnalytics, CompaniesAnalytics, CamerasAnalytics, CrimeTypeAnalytics, CompanyComparison } from "./pages/admin/AnalyticsPages";
import CompanyManagement from "./pages/admin/CompanyManagement";
import UserManagement from "./pages/admin/UserManagement";
import RoleManagement from "./pages/admin/RoleManagement";
import FormBuilder from "./pages/admin/FormBuilder";
import DeviceManagement from "./pages/admin/DeviceManagement";
import SystemConfig from "./pages/admin/SystemConfig";
import WeaponDetectionPage from "./pages/WeaponDetectionPage";
import FaceMatchingPage from "./pages/FaceMatchingPage";
import OfficerTracking from "./pages/admin/OfficerTracking";
import NationalIdRegistration from "./pages/admin/NationalIdRegistration";
import RegisteredCitizens from "./pages/admin/RegisteredCitizens";
import VehicleRegistration from "./pages/admin/VehicleRegistration";
import LicenseExpired from "./pages/LicenseExpired";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SocketProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/license-expired" element={<LicenseExpired />} />

              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/cameras" element={<ProtectedRoute><CamerasPage /></ProtectedRoute>} />
              <Route path="/detection" element={<ProtectedRoute><DetectionPage /></ProtectedRoute>} />
              {/* <Route path="/weapon-detection" element={<ProtectedRoute><WeaponDetectionPage /></ProtectedRoute>} /> */}
              <Route path="/assigned" element={<ProtectedRoute><AssignedDetections /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              {/* <Route path="/fingerprint-matching" element={<ProtectedRoute><FingerprintMatchingPage /></ProtectedRoute>} /> */}
              {/* <Route path="/face-matching" element={<ProtectedRoute><FaceMatchingPage /></ProtectedRoute>} /> */}
              {/* <Route path="/simulation" element={<ProtectedRoute><SimulationPage /></ProtectedRoute>} /> */}

              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute><DetectionsAnalytics /></ProtectedRoute>} />
              <Route path="/admin/analytics/detections" element={<ProtectedRoute><DetectionsAnalytics /></ProtectedRoute>} />
              <Route path="/admin/analytics/crime-types" element={<ProtectedRoute><CrimeTypeAnalytics /></ProtectedRoute>} />
              <Route path="/admin/analytics/company-comparison" element={<ProtectedRoute><CompanyComparison /></ProtectedRoute>} />
              <Route path="/admin/analytics/users" element={<ProtectedRoute><UsersAnalytics /></ProtectedRoute>} />
              <Route path="/admin/analytics/companies" element={<ProtectedRoute><CompaniesAnalytics /></ProtectedRoute>} />
              <Route path="/admin/analytics/cameras" element={<ProtectedRoute><CamerasAnalytics /></ProtectedRoute>} />
              <Route path="/admin/companies" element={<ProtectedRoute><CompanyManagement /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute><RoleManagement /></ProtectedRoute>} />
              <Route path="/admin/forms" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
              <Route path="/admin/devices" element={<ProtectedRoute><DeviceManagement /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute><SystemConfig /></ProtectedRoute>} />
              <Route path="/admin/officer-tracking" element={<ProtectedRoute><OfficerTracking /></ProtectedRoute>} />
              {/* <Route path="/admin/national-id/register" element={<ProtectedRoute><NationalIdRegistration /></ProtectedRoute>} /> */}
              {/* <Route path="/admin/national-id/citizens" element={<ProtectedRoute><RegisteredCitizens /></ProtectedRoute>} /> */}
              <Route path="/admin/vehicle-registration" element={<ProtectedRoute><VehicleRegistration /></ProtectedRoute>} />


              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
