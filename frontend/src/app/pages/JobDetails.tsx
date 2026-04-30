import { useParams } from "react-router";
import { MapPin, DollarSign, Briefcase, Clock, Share2, Heart, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { useSavedJobsContext } from "../context/SavedJobsContext";
import { toast } from "sonner";
import { useState } from "react";

export function JobDetails() {
  const { id } = useParams();
  const { isJobSaved, toggleSave, updateJobStatus } = useSavedJobsContext();
  const safeId = id || "unknown-job";
  const isSaved = isJobSaved(safeId);
  const [showApplyOptions, setShowApplyOptions] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"applied" | "not_yet" | "">("");

  const handleSaveClick = () => {
    const wasSaved = toggleSave({
      id: safeId,
      company: "TechVentures Inc.",
      title: "Senior Full Stack Engineer",
      location: "Remote",
      salary: "$140k-$180k",
      jobType: "Full-time",
      experience: "Senior (5+ years)",
      postedTime: "2 days ago",
      applicationStatus: applicationStatus || "not_yet",
    });

    if (wasSaved) {
      toast.success("Job saved!", {
        description: "Senior Full Stack Engineer at TechVentures Inc.",
      });
    } else {
      toast.info("Job removed from saved");
    }
  };

  const handleApplyNowClick = () => {
    setShowApplyOptions(true);
  };

  const handleApplicationStatusSelect = (status: "applied" | "not_yet") => {
    setApplicationStatus(status);
    if (isSaved) {
      updateJobStatus(safeId, status);
    }
    toast.success(status === "applied" ? "Marked as Applied" : "Marked as Not Yet");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-[1200px] mx-auto">
          <Link to="/jobs" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-2xl">T</span>
              </div>

              <div className="flex-1">
                <h1 className="mb-2">Senior Full Stack Engineer</h1>
                <p className="text-xl text-gray-700 mb-4">TechVentures Inc.</p>

                <div className="flex flex-wrap gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Remote
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    $140k-$180k
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Full-time
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Posted 2 days ago
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleSaveClick}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Heart className={`w-5 h-5 transition-colors ${isSaved ? "fill-red-500 text-red-500" : "text-gray-600"}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApplyNowClick}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Now
              </button>
              <button className="px-8 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                Easy Apply
              </button>
            </div>
            {showApplyOptions && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-700 mb-3">Have you applied to this job?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApplicationStatusSelect("applied")}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      applicationStatus === "applied"
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white text-green-700 border-green-300 hover:bg-green-50"
                    }`}
                  >
                    Applied
                  </button>
                  <button
                    onClick={() => handleApplicationStatusSelect("not_yet")}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      applicationStatus === "not_yet"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    Not Yet
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="mb-4">About the Role</h2>
                <div className="prose prose-gray max-w-none space-y-4">
                  <p>
                    We're looking for a talented Senior Full Stack Engineer to join our growing team.
                    You'll work on cutting-edge technologies to build scalable web applications that
                    serve millions of users worldwide.
                  </p>
                  <p>
                    As a senior member of the team, you'll have the opportunity to mentor junior developers,
                    architect solutions, and make key technical decisions that shape our product's future.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="mb-4">Responsibilities</h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Design and develop scalable full-stack applications using React, Node.js, and PostgreSQL</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Collaborate with product managers and designers to define feature requirements</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Write clean, maintainable code with comprehensive test coverage</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Mentor junior engineers and conduct code reviews</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Participate in technical architecture discussions and planning</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h2 className="mb-4">Requirements</h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>5+ years of professional software development experience</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Strong proficiency in React, TypeScript, and Node.js</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Experience with SQL databases and API design</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Excellent communication and collaboration skills</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Bachelor's degree in Computer Science or equivalent experience</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="mb-4">Job Details</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Experience Level</p>
                    <p className="font-medium">Senior (5+ years)</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Job Type</p>
                    <p className="font-medium">Full-time, Remote</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Salary Range</p>
                    <p className="font-medium">$140,000 - $180,000</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Location</p>
                    <p className="font-medium">Remote (US Only)</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="mb-4">About the Company</h3>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>
                    TechVentures Inc. is a rapidly growing startup focused on revolutionizing
                    the way teams collaborate and communicate.
                  </p>
                  <div className="pt-3 border-t border-gray-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Industry</span>
                      <span className="font-medium">SaaS, Technology</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Company Size</span>
                      <span className="font-medium">50-200 employees</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Founded</span>
                      <span className="font-medium">2020</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
