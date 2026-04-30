import { useState } from "react";
import { Upload, FileText, Sparkles, X, CheckCircle2, ArrowRight, Plus } from "lucide-react";
import { JobCard } from "../components/JobCard";
import { ResumeGenerator } from "../components/ResumeGenerator";
import { toast } from "sonner";
import { useNavigate } from "react-router";

const matchedJobs = [
  {
    id: "job-4",
    company: "AI Innovations",
    title: "Research Scientist",
    location: "Remote",
    salary: "$150k-$190k",
    jobType: "Remote",
    experience: "PhD or 6+ years",
    postedTime: "1 week ago"
  },
  {
    id: "job-2",
    company: "DataStream Solutions",
    title: "Machine Learning Engineer",
    location: "San Francisco, CA",
    salary: "$160k-$200k",
    jobType: "Hybrid",
    experience: "3-5 years",
    postedTime: "1 day ago"
  },
  {
    id: "job-1",
    company: "TechVentures Inc.",
    title: "Senior Full Stack Engineer",
    location: "Remote",
    salary: "$140k-$180k",
    jobType: "Remote",
    experience: "5+ years",
    postedTime: "2 days ago"
  }
];

export function SmartSearch() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [courseInput, setCourseInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleFileUpload = (file: File) => {
    if (file && (file.type === "application/pdf" || file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.type === "text/plain")) {
      setUploadedFile(file);
      setManualText("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleSubmit = async () => {
    if (!(uploadedFile || manualText.trim() || courses.length > 0 || skills.length > 0)) {
      setSearchError("Please provide resume or profile details before searching.");
      return;
    }

    setSearchError("");
    setIsAnalyzing(true);
    toast.success("Analyzing your profile...");

    try {
      const response = await fetch("http://127.0.0.1:8000/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skills,
          courses,
          projects: [],
          resume_text: manualText.trim() || ""
        })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }

      const data = await response.json();
      toast.success(`Found ${data.matches?.length || 0} matching opportunities!`);
      navigate("/jobs", { state: { matches: data.matches } });
    } catch (error) {
      console.error("API Error:", error);
      setSearchError("Could not generate matches. Please make sure the backend is running and try again.");
      toast.error("Unable to connect to matching service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setManualText("");
    setCourses([]);
    setSkills([]);
    setShowResults(false);
    setSearchError("");
    setCurrentStep(1);
  };

  const addCourse = () => {
    if (courseInput.trim() && !courses.includes(courseInput.trim())) {
      setCourses([...courses, courseInput.trim()]);
      setCourseInput("");
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeCourse = (course: string) => {
    setCourses(courses.filter(c => c !== course));
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const canProceedToStep = (step: number) => {
    if (step === 2) return uploadedFile !== null || manualText.trim() !== "";
    if (step === 3) return courses.length > 0 || skills.length > 0;
    return true;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-[#5b7bd5] to-[#8b5bd5] text-white px-6 py-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8" />
            <h1>AI Match Assistant</h1>
          </div>
          <p className="text-white/90">Let AI analyze your academic profile and find the perfect career matches</p>

          {!showResults && (
            <div className="flex items-center gap-4 mt-8">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-white' : 'text-white/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'bg-white text-blue-600 border-white' : 'border-white/50'}`}>
                  {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                </div>
                <span className="text-sm font-medium">Resume/Experience</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50" />
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-white' : 'text-white/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'bg-white text-blue-600 border-white' : 'border-white/50'}`}>
                  {currentStep > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                </div>
                <span className="text-sm font-medium">Coursework & Skills</span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50" />
              <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-white' : 'text-white/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'bg-white text-blue-600 border-white' : 'border-white/50'}`}>
                  {currentStep > 3 ? <CheckCircle2 className="w-5 h-5" /> : '3'}
                </div>
                <span className="text-sm font-medium">Generate Matches</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-[1200px] mx-auto">
          {!showResults ? (
            <div className="space-y-6 mb-8">
              {/* Step 1: Resume/Experience */}
              {currentStep >= 1 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl">Step 1: Upload Resume or Enter Experience</h2>
                    {currentStep > 1 && (
                      <button onClick={() => setCurrentStep(1)} className="text-blue-600 hover:underline text-sm">
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2>Upload Resume</h2>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50"
                      : uploadedFile
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {uploadedFile ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-1">{uploadedFile.name}</p>
                        <p className="text-sm text-gray-600">
                          {(uploadedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="mb-2">Drag & drop your resume here</h3>
                      <p className="text-gray-600 mb-4">or</p>
                      <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                        Browse Files
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      <p className="text-sm text-gray-500 mt-4">
                        Supports PDF, DOC, DOCX, TXT (Max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2>Manual Entry</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-gray-700">Enter your skills, experience, and qualifications</label>
                    <textarea
                      value={manualText}
                      onChange={(e) => {
                        setManualText(e.target.value);
                        setUploadedFile(null);
                      }}
                      placeholder="Example: Full Stack Developer with 5 years of experience in React, Node.js, and PostgreSQL. Built scalable web applications serving millions of users. Expert in TypeScript, AWS, Docker..."
                      className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Include your job title, years of experience, technical skills, industries, and key achievements
                  </p>
                </div>
              </div>
                  </div>

                  {currentStep === 1 && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => canProceedToStep(2) && setCurrentStep(2)}
                        disabled={!canProceedToStep(2)}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        Continue to Skills
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Courses & Skills */}
              {currentStep >= 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl">Step 2: Add Coursework & Skills</h2>
                    {currentStep > 2 && (
                      <button onClick={() => setCurrentStep(2)} className="text-blue-600 hover:underline text-sm">
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="mb-4">Courses Completed</h3>
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={courseInput}
                          onChange={(e) => setCourseInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addCourse()}
                          placeholder="e.g., Data Structures, Machine Learning"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={addCourse}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {courses.map((course) => (
                          <div key={course} className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                            <span className="text-sm">{course}</span>
                            <button onClick={() => removeCourse(course)} className="hover:bg-purple-200 rounded-full p-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="mb-4">Technical Skills</h3>
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                          placeholder="e.g., React, Python, AWS"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button
                          onClick={addSkill}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <div key={skill} className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                            <span className="text-sm">{skill}</span>
                            <button onClick={() => removeSkill(skill)} className="hover:bg-green-200 rounded-full p-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {currentStep === 2 && (
                    <div className="flex justify-between">
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        Review & Generate
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Generate Matches */}
              {currentStep >= 3 && !showResults && (
                <div className="space-y-6">
                  <h2 className="text-2xl">Step 3: Generate Your Matches</h2>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <h3 className="mb-4">Profile Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 mb-1">Resume</p>
                        <p className="font-semibold text-gray-900">
                          {uploadedFile ? uploadedFile.name : manualText ? "Manual Entry" : "Not provided"}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-600 mb-1">Courses</p>
                        <p className="font-semibold text-gray-900">{courses.length} courses added</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-600 mb-1">Skills</p>
                        <p className="font-semibold text-gray-900">{skills.length} skills added</p>
                      </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 mb-6">
                      <div className="flex items-start gap-4">
                        <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Ready to find your matches!</h4>
                          <p className="text-gray-700 text-sm">
                            Our AI will analyze your academic profile and match it with job opportunities that align with your coursework, skills, and experience.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isAnalyzing}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg"
                      >
                        {isAnalyzing ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Generate Matches
                          </>
                        )}
                      </button>
                    </div>
                    {searchError && (
                      <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        {searchError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3>Analysis Complete</h3>
                    <p className="text-gray-600">Found {matchedJobs.length} jobs matching your profile</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  New Search
                </button>
              </div>
            </div>
          )}


          {showResults && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2>Recommended Jobs</h2>
                <div className="flex gap-2">
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                    Best Match
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                    Most Recent
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {matchedJobs.map((job, index) => (
                  <JobCard
                    key={index}
                    {...job}
                    matchScore={95 - index * 5}
                    matchReason={`Your ${courses.length > 0 ? courses[0] : 'academic'} background aligns with this role's requirements`}
                    requiredSkills={["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"]}
                    matchedSkills={skills.length > 0 ? skills.slice(0, 3) : ["React", "TypeScript"]}
                  />
                ))}
              </div>

              <div className="mt-8 text-center">
                <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Load More Matches
                </button>
              </div>

              <div className="mt-12">
                <ResumeGenerator />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
