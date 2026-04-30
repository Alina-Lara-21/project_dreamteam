import { ChevronLeft, ChevronRight } from "lucide-react";
import { JobCard } from "./JobCard";

const recentJobs = [
  {
    id: "job-9",
    company: "TechCo",
    title: "Senior Frontend Engineer",
    location: "Remote",
    salary: "$140k-$180k",
    jobType: "Remote",
    experience: "5+ years",
    postedTime: "3 days ago",
    logo: "T"
  },
  {
    id: "job-10",
    company: "DataFlow",
    title: "Machine Learning Engineer",
    location: "San Francisco, CA",
    salary: "$160k-$200k",
    jobType: "Hybrid",
    experience: "4+ years",
    postedTime: "1 day ago",
    logo: "D"
  },
  {
    id: "job-11",
    company: "CloudBase",
    title: "DevOps Engineer",
    location: "Austin, TX",
    salary: "$130k-$170k",
    jobType: "Remote",
    experience: "3+ years",
    postedTime: "5 days ago",
    logo: "C"
  },
  {
    id: "job-12",
    company: "AI Labs",
    title: "Research Engineer",
    location: "Remote",
    salary: "$150k-$190k",
    jobType: "Remote",
    experience: "PhD",
    postedTime: "2 days ago",
    logo: "A"
  }
];

export function RecentlyViewed() {
  return (
    <div className="bg-white px-6 py-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2>Recently Viewed Jobs</h2>
          <div className="flex gap-2">
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentJobs.map((job) => (
            <JobCard key={job.id} {...job} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <button className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
            Load More
          </button>
        </div>
      </div>
    </div>
  );
}
