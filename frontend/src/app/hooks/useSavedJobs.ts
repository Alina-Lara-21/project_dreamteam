import { useState, useEffect } from 'react';

export interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  salary: string;
  jobType: string;
  experience: string;
  postedTime: string;
  logo?: string;
  applicationStatus?: "applied" | "not_yet";
}

const STORAGE_KEY = 'savedJobs';

export function useSavedJobs() {
  const [savedJobs, setSavedJobs] = useState<Job[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedJobs));
  }, [savedJobs]);

  const saveJob = (job: Job) => {
    setSavedJobs((prev) => {
      if (prev.some((j) => j.id === job.id)) {
        return prev;
      }
      return [...prev, job];
    });
  };

  const unsaveJob = (jobId: string) => {
    setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const isJobSaved = (jobId: string) => {
    return savedJobs.some((j) => j.id === jobId);
  };

  const updateJobStatus = (jobId: string, status: "applied" | "not_yet") => {
    setSavedJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, applicationStatus: status } : job))
    );
  };

  const toggleSave = (job: Job) => {
    if (isJobSaved(job.id)) {
      unsaveJob(job.id);
      return false;
    } else {
      saveJob(job);
      return true;
    }
  };

  return {
    savedJobs,
    saveJob,
    unsaveJob,
    isJobSaved,
    toggleSave,
    updateJobStatus,
  };
}
