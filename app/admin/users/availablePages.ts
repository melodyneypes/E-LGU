export interface AvailablePage {
  label: string;
  path: string;
  category: string;
}

export const AVAILABLE_PAGES: AvailablePage[] = [
  { label: "Dashboard", path: "/admin/dashboard", category: "Core" },
  { label: "Website Settings", path: "/admin/settings", category: "Settings" },
  { label: "Platform Info", path: "/admin/about", category: "Content" },
  { label: "Past Mayors/Captains", path: "/admin/about/past-mayors", category: "Content" },
  { label: "Barangays List", path: "/admin/barangays/list", category: "Infrastructure" },
  { label: "Barangay Admins", path: "/admin/barangays/admins", category: "Infrastructure" },
  { label: "Announcements", path: "/admin/announcements", category: "Content" },
  { label: "News & Updates", path: "/admin/news", category: "Content" },
  { label: "Events", path: "/admin/events", category: "Content" },
  { label: "LGU Projects", path: "/admin/projects", category: "Content" },
  { label: "Kainan (Dining)", path: "/admin/dining", category: "Content" },
  { label: "Tuluyan (Stay)", path: "/admin/accommodation", category: "Content" },
  { label: "Gallery", path: "/admin/tourism", category: "Content" },
  { label: "Church Management", path: "/admin/church", category: "Content" },
  { label: "Public Reports", path: "/admin/reports", category: "Management" },
  { label: "Logistics Control", path: "/admin/logistics", category: "Management" },
  { label: "Job Postings", path: "/admin/jobs", category: "Management" },
  { label: "Council Members", path: "/admin/officials", category: "Management" },
  { label: "Hotlines", path: "/admin/hotlines", category: "Management" },
  { label: "Resident Approvals", path: "/admin/resident-approvals", category: "Residents" },
  { label: "Resident Registry", path: "/admin/residents", category: "Residents" },
  { label: "Household Map", path: "/admin/households", category: "Residents" },
  { label: "User Accounts", path: "/admin/users", category: "Security" },
];
