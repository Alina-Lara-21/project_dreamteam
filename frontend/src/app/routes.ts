import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { Dashboard } from "./pages/Dashboard";
import { JobSearch } from "./pages/JobSearch";
import { SavedJobs } from "./pages/SavedJobs";
import { JobDetails } from "./pages/JobDetails";
import { Profile } from "./pages/Profile";
import { SmartSearch } from "./pages/SmartSearch";
import { AcademicProfile } from "./pages/AcademicProfile";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "academic-profile", Component: AcademicProfile },
      { path: "jobs", Component: JobSearch },
      { path: "jobs/:id", Component: JobDetails },
      { path: "saved", Component: SavedJobs },
      { path: "smart-search", Component: SmartSearch },
      { path: "profile", Component: Profile },
      { path: "*", Component: NotFound },
    ],
  },
]);
