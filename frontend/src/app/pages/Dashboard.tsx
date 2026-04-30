import { HeroSection } from "../components/HeroSection";
import { SearchFilters } from "../components/SearchFilters";
import { ApplicationTracker } from "../components/ApplicationTracker";
import { JobListings } from "../components/JobListings";
import { RecentlyViewed } from "../components/RecentlyViewed";
import { useState } from "react";
import { useNavigate } from "react-router";

export function Dashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<any>(null);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  return (
    <>
      <HeroSection />
      <SearchFilters onFilterChange={handleFilterChange} />
      <div className="px-6 pt-4">
        <div className="max-w-[1400px] mx-auto flex justify-end">
          <button
            onClick={() => navigate("/jobs", { state: { filters } })}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search Jobs
          </button>
        </div>
      </div>
      <ApplicationTracker />
      <JobListings filters={filters} />
      <RecentlyViewed />
    </>
  );
}
