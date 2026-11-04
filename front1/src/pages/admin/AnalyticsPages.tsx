export { DetectionsAnalytics } from "./analytics/DetectionsAnalytics";
export { UsersAnalytics } from "./analytics/UsersAnalytics";
export { CamerasAnalytics } from "./analytics/CamerasAnalytics";
export { CompaniesAnalytics } from "./analytics/CompaniesAnalytics";
export { CrimeTypeAnalytics } from "./analytics/CrimeTypeAnalytics";
export { CompanyComparison } from "./analytics/CompanyComparison";

// Default export fallback or overview if needed later
import { DetectionsAnalytics } from "./analytics/DetectionsAnalytics";
export default function AnalyticsPage() {
  return <DetectionsAnalytics />;
}
