import { Outlet } from "react-router";
import { NavigationBar } from "../components/NavigationBar";
import { SavedJobsProvider } from "../context/SavedJobsContext";
import { Toaster } from "../components/ui/sonner";

export function Root() {
  return (
    <SavedJobsProvider>
      <div className="min-h-screen bg-gray-50">
        <NavigationBar />
        <Outlet />
        <Toaster />
      </div>
    </SavedJobsProvider>
  );
}
