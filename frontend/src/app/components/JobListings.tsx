import { JobCard } from "./JobCard";
import { useLocation } from "react-router";
import { useEffect, useState } from "react";

interface JobListingsProps {
  filters?: any;
}

interface BackendJob {
  id: number;
  title?: string;
  company?: string;
  skills_required?: string[];
  salary_range?: string | null;
  location?: string | null;
}

interface BackendMatch {
  job_id?: number;
  title?: string;
  company?: string;
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  explanation?: string;
  salary_range?: string | null;
}

export function JobListings({ filters }: JobListingsProps = {}) {
  const location = useLocation();
  const apiMatches = location.state?.matches;
  const [baseJobs, setBaseJobs] = useState<any[]>([]);
  const [displayJobs, setDisplayJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const mapBackendJob = (job: BackendJob) => ({
    id: String(job.id),
    company: job.company || "Unknown Company",
    title: job.title || "Untitled Role",
    location: job.location || "Location not provided",
    salary: job.salary_range || "Salary not provided",
    jobType: "Not specified",
    experience: "Not specified",
    postedTime: "Recently posted",
    requiredSkills: Array.isArray(job.skills_required) ? job.skills_required : [],
    matchedSkills: [],
  });

  const mapBackendMatch = (match: BackendMatch, index: number) => ({
    id: `match-${match.job_id ?? index}`,
    company: match.company || "Unknown Company",
    title: match.title || "Untitled Role",
    location: "Location not provided",
    salary: match.salary_range || "Salary not provided",
    jobType: "Not specified",
    experience: "Not specified",
    postedTime: "Recently posted",
    matchScore: typeof match.match_score === "number" ? match.match_score : undefined,
    matchReason: match.explanation || "",
    matchedSkills: Array.isArray(match.matched_skills) ? match.matched_skills : [],
    missingSkills: Array.isArray(match.missing_skills) ? match.missing_skills : [],
  });

  useEffect(() => {
    const loadDashboardJobs = async () => {
      if (apiMatches && apiMatches.length > 0) {
        const mappedMatches = apiMatches.map((match: BackendMatch, index: number) => mapBackendMatch(match, index));
        setBaseJobs(mappedMatches);
        setDisplayJobs(mappedMatches.slice(0, 6));
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("http://127.0.0.1:8000/jobs");
        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }
        const data = await response.json();
        const jobs = Array.isArray(data?.jobs) ? data.jobs : [];
        const mappedJobs = jobs.map((job: BackendJob) => mapBackendJob(job));
        setBaseJobs(mappedJobs);
        setDisplayJobs(mappedJobs.slice(0, 6));
      } catch (err) {
        console.error("Dashboard jobs fetch failed:", err);
        setError("Could not load recommended jobs.");
        setBaseJobs([]);
        setDisplayJobs([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardJobs();
  }, [apiMatches]);

  useEffect(() => {
    if (!filters) {
      setDisplayJobs(baseJobs.slice(0, 6));
      return;
    }

    let filtered = [...baseJobs];

    // Filter by search query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(job =>
        (job.title || "").toLowerCase().includes(query) ||
        (job.company || "").toLowerCase().includes(query)
      );
    }

    // Filter by location
    if (filters.location) {
      filtered = filtered.filter(job =>
        (job.location || "").toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Filter by job type
    if (filters.jobType) {
      filtered = filtered.filter(job =>
        (job.jobType || "").toLowerCase() === filters.jobType.toLowerCase()
      );
    }

    // Filter by experience
    if (filters.experience && filters.experience.length > 0) {
      filtered = filtered.filter(job => {
        const jobExp = (job.experience || "").toLowerCase();
        return filters.experience.some((exp: string) => {
          const expLower = exp.toLowerCase();
          if (expLower === 'internship') return jobExp.includes('intern');
          if (expLower === 'entry level') return jobExp.includes('0-1') || jobExp.includes('entry');
          if (expLower === 'junior') return jobExp.includes('1-2') || jobExp.includes('junior');
          if (expLower === 'mid-level') return jobExp.includes('3-5') || jobExp.includes('mid');
          if (expLower === 'senior') return jobExp.includes('5+') || jobExp.includes('senior') || jobExp.includes('phd');
          return false;
        });
      });
    }

    setDisplayJobs(filtered.slice(0, 6));
  }, [filters, baseJobs]);

  return (
    <div className="bg-white px-6 py-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2>Recommended Roles Based on Your Profile</h2>
          <p className="text-gray-600">
            {apiMatches ? `${displayJobs.length} AI-matched results` : `Showing ${displayJobs.length} results`}
          </p>
        </div>

        <div className="space-y-4">
          {isLoading && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-600">
              Loading jobs...
            </div>
          )}
          {!isLoading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
              {error}
            </div>
          )}
          {!isLoading && !error && displayJobs.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-700">
              No jobs found for current filters.
            </div>
          )}
          {!isLoading && !error && displayJobs.map((job, index) => (
            <JobCard key={job.id || index} {...job} />
          ))}
        </div>

        <div className="mt-8 text-center">
          <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Load More Jobs
          </button>
        </div>
      </div>
    </div>
  );
}
