import { createContext, useContext, ReactNode } from 'react';
import { useSavedJobs, Job } from '../hooks/useSavedJobs';

interface SavedJobsContextType {
  savedJobs: Job[];
  saveJob: (job: Job) => void;
  unsaveJob: (jobId: string) => void;
  isJobSaved: (jobId: string) => boolean;
  toggleSave: (job: Job) => boolean;
  updateJobStatus: (jobId: string, status: "applied" | "not_yet") => void;
}

const SavedJobsContext = createContext<SavedJobsContextType | undefined>(undefined);

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const savedJobsUtils = useSavedJobs();

  return (
    <SavedJobsContext.Provider value={savedJobsUtils}>
      {children}
    </SavedJobsContext.Provider>
  );
}

export function useSavedJobsContext() {
  const context = useContext(SavedJobsContext);
  if (context === undefined) {
    throw new Error('useSavedJobsContext must be used within a SavedJobsProvider');
  }
  return context;
}
