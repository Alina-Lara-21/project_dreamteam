import { MapPin, DollarSign, Briefcase, Heart, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "react-router";
import { useSavedJobsContext } from "../context/SavedJobsContext";
import { toast } from "sonner";
import { useState } from "react";

interface JobCardProps {
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
  matchScore?: number;
  matchReason?: string;
  requiredSkills?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
}

export function JobCard({
  id,
  company,
  title,
  location,
  salary,
  jobType,
  experience,
  postedTime,
  logo,
  applicationStatus,
  matchScore,
  matchReason,
  requiredSkills = [],
  matchedSkills = [],
  missingSkills
}: JobCardProps) {
  const { isJobSaved, toggleSave } = useSavedJobsContext();
  const isSaved = isJobSaved(id);
  const [showDetails, setShowDetails] = useState(false);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const wasSaved = toggleSave({
      id,
      company,
      title,
      location,
      salary,
      jobType,
      experience,
      postedTime,
      logo
    });

    if (wasSaved) {
      toast.success("Job saved!", {
        description: `${title} at ${company}`,
      });
    } else {
      toast.info("Job removed from saved");
    }
  };

  const getMatchColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-700";
    if (score >= 80) return "bg-green-100 text-green-700 border-green-300";
    if (score >= 60) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const missingSkillsToShow = missingSkills ?? requiredSkills.filter(skill => !matchedSkills.includes(skill));
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/jobs/${id}`} className="block p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">{company.charAt(0)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                    {title}
                  </h3>
                  {matchScore && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getMatchColor(matchScore)}`}>
                      {matchScore}% Match
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{company}</p>
              </div>
              <button
                onClick={handleSaveClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Heart className={`w-5 h-5 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} />
              </button>
            </div>

            {matchReason && (
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Why this match:</strong> {matchReason}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {location}
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {salary}
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {jobType}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                {experience}
              </span>
              <span className="text-sm text-gray-500">{postedTime}</span>
              {applicationStatus && (
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    applicationStatus === "applied"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {applicationStatus === "applied" ? "Applied" : "Not Yet"}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {(matchedSkills.length > 0 || missingSkillsToShow.length > 0) && (
        <div className="border-t border-gray-200">
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowDetails(!showDetails);
            }}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Skill Match Analysis</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <div className="px-6 pb-6 space-y-4">
              {matchedSkills.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">You have:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs border border-green-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {missingSkillsToShow.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Skills to develop:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {missingSkillsToShow.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs border border-orange-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
