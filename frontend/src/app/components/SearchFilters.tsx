import { Search, MapPin, Briefcase, Bookmark, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface SearchFiltersProps {
  onFilterChange?: (filters: any) => void;
}

export function SearchFilters({ onFilterChange }: SearchFiltersProps = {}) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [newJobsFilter, setNewJobsFilter] = useState<string>("");
  const [searchAreaFilter, setSearchAreaFilter] = useState<string>("Within 25 miles");
  const [earlyApplicant, setEarlyApplicant] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("Location");
  const [jobType, setJobType] = useState("Job Type");

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleExperience = (exp: string) => {
    setSelectedExperience(prev =>
      prev.includes(exp)
        ? prev.filter(e => e !== exp)
        : [...prev, exp]
    );
  };

  const removeFilter = (filterType: string, value: string) => {
    if (filterType === 'category') {
      setSelectedCategories(prev => prev.filter(c => c !== value));
    } else if (filterType === 'experience') {
      setSelectedExperience(prev => prev.filter(e => e !== value));
    } else if (filterType === 'newJobs') {
      setNewJobsFilter("");
    } else if (filterType === 'searchArea') {
      setSearchAreaFilter("Within 25 miles");
    } else if (filterType === 'earlyApplicant') {
      setEarlyApplicant(false);
    }
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedExperience([]);
    setNewJobsFilter("");
    setSearchAreaFilter("Within 25 miles");
    setEarlyApplicant(false);
  };

  const allActiveFilters = [
    ...selectedCategories.map(c => ({ type: 'category', value: c })),
    ...selectedExperience.map(e => ({ type: 'experience', value: e })),
    ...(newJobsFilter ? [{ type: 'newJobs', value: newJobsFilter }] : []),
    ...(searchAreaFilter !== "Within 25 miles" ? [{ type: 'searchArea', value: searchAreaFilter }] : []),
    ...(earlyApplicant ? [{ type: 'earlyApplicant', value: 'Early Applicant' }] : [])
  ];

  const getCurrentFilters = () => ({
    query: searchQuery,
    location: location !== "Location" ? location : "",
    jobType: jobType !== "Job Type" ? jobType : "",
    categories: selectedCategories,
    experience: selectedExperience,
    newJobs: newJobsFilter,
    searchArea: searchAreaFilter,
    earlyApplicant: earlyApplicant
  });

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(getCurrentFilters());
    }
  }, [searchQuery, location, jobType, selectedCategories, selectedExperience, newJobsFilter, searchAreaFilter, earlyApplicant]);

  const handleSaveSearch = () => {
    const searchData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...getCurrentFilters()
    };

    // Get existing saved searches
    const existingSaved = localStorage.getItem("savedSearches");
    const savedSearches = existingSaved ? JSON.parse(existingSaved) : [];

    // Add new search
    savedSearches.push(searchData);

    // Save to localStorage
    localStorage.setItem("savedSearches", JSON.stringify(savedSearches));

    toast.success("Search saved successfully!", {
      description: searchQuery || "Your search criteria has been saved"
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for jobs"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 flex-wrap lg:flex-nowrap">
            <div className="relative min-w-[160px]">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option>Location</option>
                <option>Remote</option>
                <option>New York</option>
                <option>San Francisco</option>
                <option>Los Angeles</option>
                <option>Bakersfield</option>
                <option>Austin</option>
              </select>
            </div>

            <div className="relative min-w-[160px]">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option>Job Type</option>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </select>
            </div>

            <button
              onClick={handleSaveSearch}
              className="px-5 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Bookmark className="w-4 h-4" />
              Save Search
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap relative">
          {allActiveFilters.map((filter, index) => (
            <button
              key={index}
              onClick={() => removeFilter(filter.type, filter.value)}
              className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full transition-colors flex items-center gap-2 group"
            >
              <span>{filter.value}</span>
              <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </button>
          ))}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          >
            {showFilters ? '− Hide Filters' : '+ More Filters'}
          </button>

          {allActiveFilters.length > 0 && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-full transition-colors text-sm"
            >
              Clear All
            </button>
          )}

          {showFilters && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[600px] overflow-y-auto">
              <div className="sticky top-0 bg-blue-600 text-white px-4 py-3 flex items-center justify-between rounded-t-xl">
                <h3 className="font-semibold">All Filters</h3>
                <button onClick={() => setShowFilters(false)} className="hover:bg-white/20 p-1 rounded transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="font-medium text-gray-900">Early Applicant</label>
                    <input
                      type="checkbox"
                      checked={earlyApplicant}
                      onChange={(e) => setEarlyApplicant(e.target.checked)}
                      className="w-10 h-5 accent-blue-600"
                    />
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h4 className="font-medium text-gray-900 mb-3">New Jobs</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="newJobs"
                        checked={newJobsFilter === "Past 24 hours"}
                        onChange={() => setNewJobsFilter("Past 24 hours")}
                        className="accent-blue-600"
                      />
                      Past 24 hours
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="newJobs"
                        checked={newJobsFilter === "Past 3 days"}
                        onChange={() => setNewJobsFilter("Past 3 days")}
                        className="accent-blue-600"
                      />
                      Past 3 days
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="newJobs"
                        checked={newJobsFilter === "Past week"}
                        onChange={() => setNewJobsFilter("Past week")}
                        className="accent-blue-600"
                      />
                      Past week
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="newJobs"
                        checked={newJobsFilter === "Past month"}
                        onChange={() => setNewJobsFilter("Past month")}
                        className="accent-blue-600"
                      />
                      Past month
                    </label>
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Job Category</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {['AI & Machine Learning', 'Consulting', 'Customer Success & Experience', 'Data & Analytics', 'Defense & Field Operations', 'Design & UX', 'Engineering', 'Finance', 'Healthcare Services', 'HR & Recruiting', 'Legal', 'Manufacturing & Production', 'Marketing', 'Operations & Support', 'Product Management'].map((category) => (
                      <label key={category} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          className="accent-blue-600"
                        />
                        {category}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Search Area</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="searchArea"
                        checked={searchAreaFilter === "Within 25 miles"}
                        onChange={() => setSearchAreaFilter("Within 25 miles")}
                        className="accent-blue-600"
                      />
                      Within 25 miles
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="searchArea"
                        checked={searchAreaFilter === "Within 50 miles"}
                        onChange={() => setSearchAreaFilter("Within 50 miles")}
                        className="accent-blue-600"
                      />
                      Within 50 miles
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="radio"
                        name="searchArea"
                        checked={searchAreaFilter === "Within 100 miles"}
                        onChange={() => setSearchAreaFilter("Within 100 miles")}
                        className="accent-blue-600"
                      />
                      Within 100 miles
                    </label>
                  </div>
                </div>

                <div className="pb-4">
                  <h4 className="font-medium text-gray-900 mb-3">Experience</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedExperience.includes("Internship")}
                        onChange={() => toggleExperience("Internship")}
                        className="accent-blue-600"
                      />
                      Internship
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedExperience.includes("Entry Level")}
                        onChange={() => toggleExperience("Entry Level")}
                        className="accent-blue-600"
                      />
                      Entry Level (0-1 Years)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedExperience.includes("Junior")}
                        onChange={() => toggleExperience("Junior")}
                        className="accent-blue-600"
                      />
                      Junior (1-2 Years)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedExperience.includes("Mid-Level")}
                        onChange={() => toggleExperience("Mid-Level")}
                        className="accent-blue-600"
                      />
                      Mid-Level (3-5 Years)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedExperience.includes("Senior")}
                        onChange={() => toggleExperience("Senior")}
                        className="accent-blue-600"
                      />
                      Senior (5+ Years)
                    </label>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2 rounded-b-xl">
                <button
                  onClick={resetFilters}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  RESET
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  VIEW RESULTS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
