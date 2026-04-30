import { JobCard } from "../components/JobCard";
import { Bookmark, Inbox } from "lucide-react";
import { useSavedJobsContext } from "../context/SavedJobsContext";

export function SavedJobs() {
  const { savedJobs } = useSavedJobsContext();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-[#5b7bd5] to-[#8b5bd5] text-white px-6 py-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="w-8 h-8" />
            <h1>Saved Jobs</h1>
          </div>
          <p className="text-white/90">Jobs you've bookmarked for later</p>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-[1400px] mx-auto">
          {savedJobs.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2>{savedJobs.length} Saved {savedJobs.length === 1 ? 'Job' : 'Jobs'}</h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                    Sort by Date
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                    Filter
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {savedJobs.map((job) => (
                  <JobCard key={job.id} {...job} />
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16">
              <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="mb-2">No saved jobs yet</h2>
                <p className="text-gray-600 mb-6">
                  Start saving jobs you're interested in by clicking the heart icon on any job listing.
                  Your saved jobs will appear here for easy access.
                </p>
                <a
                  href="/jobs"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Jobs
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
