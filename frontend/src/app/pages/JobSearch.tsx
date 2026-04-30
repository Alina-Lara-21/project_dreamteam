import { SearchFilters } from "../components/SearchFilters";
import { JobCard } from "../components/JobCard";
import { useLocation } from "react-router";
import { useEffect, useState } from "react";

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

interface BackendJob {
  id: number;
  title?: string;
  company?: string;
  skills_required?: string[];
  salary_range?: string | null;
  location?: string | null;
}

interface JobListing {
  id: string;
  company: string;
  title: string;
  location: string;
  salary: string;
  jobType: string;
  experience: string;
  postedTime: string;
  matchScore?: number;
  matchReason?: string;
  matchedSkills?: string[];
  missingSkills?: string[];
}

export function JobSearch() {
  const location = useLocation();
  const locationState = (location.state ?? {}) as { matches?: unknown; filters?: any };
  const rawMatches = locationState.matches;
  const initialFilters = locationState.filters;
  const hasProvidedMatches = rawMatches !== undefined;
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [allBackendJobs, setAllBackendJobs] = useState<JobListing[]>([]);
  const [baseJobs, setBaseJobs] = useState<JobListing[]>([]);
  const [displayJobs, setDisplayJobs] = useState<JobListing[]>([]);

  const mapApiMatchToJob = (match: BackendMatch, index: number): JobListing => ({
    id: `match-${match.job_id ?? index}`,
    company: match.company || "Unknown Company",
    title: match.title || "Untitled Role",
    location: "Location not provided",
    salary: match.salary_range || "Salary not provided",
    jobType: "Not specified",
    experience: "Not specified",
    postedTime: "Recently posted",
    matchScore: typeof match.match_score === "number" ? match.match_score : undefined,
    matchReason: match.explanation || "No explanation provided.",
    matchedSkills: Array.isArray(match.matched_skills) ? match.matched_skills : [],
    missingSkills: Array.isArray(match.missing_skills) ? match.missing_skills : [],
  });

  const mapBackendJobToListing = (job: BackendJob): JobListing => ({
    id: String(job.id),
    company: job.company || "Unknown Company",
    title: job.title || "Untitled Role",
    location: job.location || "Location not provided",
    salary: job.salary_range || "Salary not provided",
    jobType: "Not specified",
    experience: "Not specified",
    postedTime: "Recently posted",
    matchedSkills: [],
    missingSkills: [],
  });

  useEffect(() => {
    setIsLoadingMatches(true);
    setJobsError("");
    const loadJobs = async () => {
      if (hasProvidedMatches) {
        if (!Array.isArray(rawMatches)) {
          setJobsError("Received invalid match data. Please run search again.");
          setBaseJobs([]);
          setDisplayJobs([]);
          setIsLoadingMatches(false);
          return;
        }
        try {
          const mappedMatches = rawMatches.map((match, index) => mapApiMatchToJob(match as BackendMatch, index));
          setBaseJobs(mappedMatches);
          setDisplayJobs(mappedMatches);
        } catch (error) {
          console.error("Failed to map matches:", error);
          setJobsError("Could not load matched jobs. Please try again.");
          setBaseJobs([]);
          setDisplayJobs([]);
        } finally {
          setIsLoadingMatches(false);
        }
        return;
      }

      try {
        let jobsData: BackendJob[] = [];
        const initialQuery = initialFilters?.query?.trim();
        if (initialQuery) {
          const filteredResponse = await fetch(`http://127.0.0.1:8000/jobs/filter?skills=${encodeURIComponent(initialQuery)}`);
          if (!filteredResponse.ok) {
            throw new Error("Failed to fetch filtered jobs");
          }
          const filteredPayload = await filteredResponse.json();
          jobsData = Array.isArray(filteredPayload?.jobs) ? filteredPayload.jobs : [];
        } else {
          const response = await fetch("http://127.0.0.1:8000/jobs");
          if (!response.ok) {
            throw new Error("Failed to fetch jobs");
          }
          const data = await response.json();
          jobsData = Array.isArray(data?.jobs) ? data.jobs : [];
        }
        const mappedJobs = jobsData.map((job: BackendJob) => mapBackendJobToListing(job));
        const initiallyFilteredJobs = initialFilters ? applyClientFilters(mappedJobs, initialFilters) : mappedJobs;
        setAllBackendJobs(mappedJobs);
        setBaseJobs(initiallyFilteredJobs);
        setDisplayJobs(initiallyFilteredJobs);
      } catch (error) {
        console.error("Failed to load jobs:", error);
        setJobsError("Could not load jobs from backend.");
        setAllBackendJobs([]);
        setBaseJobs([]);
        setDisplayJobs([]);
      } finally {
        setIsLoadingMatches(false);
      }
    };

    loadJobs();
  }, [hasProvidedMatches, rawMatches, initialFilters]);

  const applyClientFilters = (jobs: JobListing[], filters: any) => {
    let filtered = [...jobs];

    if (filters.location) {
      filtered = filtered.filter(job =>
        (job.location || "").toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.jobType) {
      filtered = filtered.filter(job =>
        (job.jobType || "").toLowerCase() === filters.jobType.toLowerCase()
      );
    }

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

    return filtered;
  };

  const handleFilterChange = async (filters: any) => {
    if (hasProvidedMatches) {
      const queryFiltered = filters.query
        ? baseJobs.filter((job) =>
            (job.title || "").toLowerCase().includes(filters.query.toLowerCase()) ||
            (job.company || "").toLowerCase().includes(filters.query.toLowerCase())
          )
        : baseJobs;
      setDisplayJobs(applyClientFilters(queryFiltered, filters));
      return;
    }

    setIsLoadingMatches(true);
    setJobsError("");
    try {
      let sourceJobs = allBackendJobs;
      if (filters.query?.trim()) {
        const response = await fetch(`http://127.0.0.1:8000/jobs/filter?skills=${encodeURIComponent(filters.query.trim())}`);
        if (!response.ok) {
          throw new Error("Failed to filter jobs");
        }
        const data = await response.json();
        const filteredByBackend = Array.isArray(data?.jobs) ? data.jobs : [];
        sourceJobs = filteredByBackend.map((job: BackendJob) => mapBackendJobToListing(job));
      }

      const queryFiltered = !filters.query?.trim()
        ? sourceJobs
        : sourceJobs.filter((job) =>
            (job.title || "").toLowerCase().includes(filters.query.toLowerCase()) ||
            (job.company || "").toLowerCase().includes(filters.query.toLowerCase())
          );
      setBaseJobs(sourceJobs);
      setDisplayJobs(applyClientFilters(queryFiltered, filters));
    } catch (error) {
      console.error("Failed to apply filters:", error);
      setJobsError("Could not apply filters. Please try again.");
    } finally {
      setIsLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (!hasProvidedMatches) {
      setBaseJobs(allBackendJobs);
      setDisplayJobs(allBackendJobs);
    }
  }, [hasProvidedMatches, allBackendJobs]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-[#5b7bd5] to-[#8b5bd5] text-white px-6 py-12">
        <div className="max-w-[1400px] mx-auto">
          <h1 className="mb-2">Recommended Roles</h1>
          <p className="text-white/90">Opportunities matched to your academic profile and skills</p>
        </div>
      </div>

      <SearchFilters onFilterChange={handleFilterChange} />

      <div className="px-6 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="mb-1">Your Matched Roles</h2>
              <p className="text-gray-600">
                {hasProvidedMatches ?
                  `Showing ${displayJobs.length} AI-matched results` :
                  `Showing ${displayJobs.length} results sorted by compatibility`
                }
              </p>
            </div>
            
          </div>

          {isLoadingMatches && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
              Loading jobs...
            </div>
          )}

          {!isLoadingMatches && jobsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center text-red-700">
              {jobsError}
            </div>
          )}

          {!isLoadingMatches && !jobsError && displayJobs.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <h3 className="text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600">
                Try adding more skills, courses, or projects in your profile and run search again.
              </p>
            </div>
          )}

          {!isLoadingMatches && !jobsError && displayJobs.length > 0 && (
            <div className="space-y-4">
              {displayJobs.map((job, index) => (
                <JobCard key={job.id || index} {...job} />
              ))}
            </div>
          )}

          {!isLoadingMatches && !jobsError && displayJobs.length > 0 && (
            <div className="mt-8 text-center">
              <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Load More Jobs
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
