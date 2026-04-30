import { useState } from "react";
import { GraduationCap, Plus, X, Upload, CheckCircle2, Code, FileText, Briefcase, Github, Linkedin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function AcademicProfile() {
  const navigate = useNavigate();
  const [searchError, setSearchError] = useState("");
  const [courses, setCourses] = useState<string[]>(["Data Structures", "Algorithms", "Web Development"]);
  const [skills, setSkills] = useState<string[]>(["React", "TypeScript", "Python", "SQL"]);
  const [courseInput, setCourseInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingProject, setIsDraggingProject] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [projects, setProjects] = useState([
    {
      id: "1",
      title: "E-commerce Platform",
      description: "Built a full-stack e-commerce application with React, Node.js, and PostgreSQL",
      technologies: ["React", "Node.js", "PostgreSQL"],
      file: null as File | null
    }
  ]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const addCourse = () => {
    if (courseInput.trim() && !courses.includes(courseInput.trim())) {
      setCourses([...courses, courseInput.trim()]);
      setCourseInput("");
      toast.success("Course added!");
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
      toast.success("Skill added!");
    }
  };

  const removeCourse = (course: string) => {
    setCourses(courses.filter(c => c !== course));
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleResumeUpload = (file: File) => {
    if (file && file.type === "application/pdf") {
      setResumeFile(file);
      toast.success("Resume uploaded successfully!");
    } else {
      toast.error("Please upload a PDF file");
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
    if (file) {
      handleResumeUpload(file);
    }
  };

  const handleProjectFileUpload = (file: File) => {
    if (file) {
      const newProject = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        description: "Project file uploaded",
        technologies: [] as string[],
        file: file
      };
      setProjects([...projects, newProject]);
      toast.success("Project file uploaded!");
    }
  };

  const handleProjectDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProject(true);
  };

  const handleProjectDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProject(false);
  };

  const handleProjectDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingProject(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleProjectFileUpload(file);
    }
  };

  const removeProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    toast.info("Project removed");
  };

  const handleAISearch = async () => {
    if (!resumeFile && courses.length === 0 && skills.length === 0) {
      toast.error("Please add at least your resume, courses, or skills to search");
      return;
    }

    setSearchError("");
    setIsSearching(true);
    toast.success("Analyzing your profile with AI...");

    try {
      const response = await fetch("http://127.0.0.1:8000/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          skills,
          courses,
          projects: projects
            .map((p) => p.description?.trim() || p.title?.trim() || "")
            .filter(Boolean),
          resume_text: ""
        })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch job matches");
      }

      const data = await response.json();
      setIsSearching(false);
      toast.success(`Found ${data.matches?.length || 0} matching opportunities!`);

      // Navigate to jobs page with API results
      navigate("/jobs", { state: { matches: data.matches } });
    } catch (error) {
      setIsSearching(false);
      console.error("API Error:", error);
      setSearchError("Could not generate matches. Please make sure the backend is running and try again.");
      toast.error("Unable to connect to matching service.");
    }
  };

  const handleSaveProfile = () => {
    toast.success("Profile saved successfully!");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-[#5b7bd5] to-[#8b5bd5] text-white px-6 py-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-8 h-8" />
            <h1>Academic Profile</h1>
          </div>
          <p className="text-white/90">Build your academic profile to connect your coursework with career opportunities</p>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-[1200px] mx-auto space-y-6">

          {/* Resume Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2>Resume</h2>
                <p className="text-sm text-gray-600">Upload your resume for better matching</p>
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : resumeFile
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-blue-400"
              }`}
            >
              {resumeFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 mb-1">{resumeFile.name}</p>
                    <p className="text-sm text-gray-600">{(resumeFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <button
                    onClick={() => setResumeFile(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Remove Resume
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="mb-2">Upload your resume</h3>
                  <p className="text-gray-600 mb-4">PDF format (Max 10MB)</p>
                  <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                    Choose File
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => e.target.files && handleResumeUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Professional Links */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2>Professional Links</h2>
                <p className="text-sm text-gray-600">Add your GitHub and LinkedIn profiles</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    GitHub Profile
                  </div>
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/yourusername"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn Profile
                  </div>
                </label>
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourusername"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {(githubUrl || linkedinUrl) && (
                <div className="flex gap-3 pt-2">
                  {githubUrl && (
                    <a
                      href={githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      View GitHub
                    </a>
                  )}
                  {linkedinUrl && (
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Linkedin className="w-4 h-4" />
                      View LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Completed Courses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2>Completed Courses</h2>
                <p className="text-sm text-gray-600">Add courses you've completed</p>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCourse()}
                placeholder="e.g., Data Structures, Machine Learning, Web Development"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={addCourse}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {courses.map((course) => (
                <div
                  key={course}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full border border-purple-200"
                >
                  <span>{course}</span>
                  <button
                    onClick={() => removeCourse(course)}
                    className="hover:bg-purple-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2>Technical Skills</h2>
                <p className="text-sm text-gray-600">Add programming languages, frameworks, and tools</p>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="e.g., React, Python, Docker, AWS"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={addSkill}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(skill)}
                    className="hover:bg-green-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Projects */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2>Academic Projects</h2>
                <p className="text-sm text-gray-600">Showcase projects that demonstrate your skills</p>
              </div>
            </div>

            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <h3>{project.title}</h3>
                    <button
                      onClick={() => removeProject(project.id)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <p className="text-gray-700 mb-3">{project.description}</p>
                  {project.file && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <FileText className="w-4 h-4" />
                      <span>{project.file.name}</span>
                      <span className="text-gray-400">({(project.file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  )}
                  {project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech) => (
                        <span key={tech} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div
                onDragOver={handleProjectDragOver}
                onDragLeave={handleProjectDragLeave}
                onDrop={handleProjectDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDraggingProject
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 hover:border-orange-400 hover:bg-orange-50"
                }`}
              >
                <Upload className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                <h3 className="mb-2">Upload Project File</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Drag & drop a project file or click to browse
                </p>
                <label className="inline-block px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Choose File
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.zip,.txt"
                    onChange={(e) => e.target.files && handleProjectFileUpload(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-3">
                  Supports PDF, DOC, DOCX, ZIP, TXT (Max 10MB)
                </p>
              </div>
            </div>
          </div>

          {/* AI Search Section */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-8 h-8" />
              <h2 className="text-white">Ready to Find Your Perfect Match?</h2>
            </div>
            <p className="text-white/90 mb-6">
              Our AI will analyze your academic profile and connect you with the best job opportunities that match your skills, coursework, and experience.
            </p>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-white/70 mb-1">Resume</p>
                  <p className="font-semibold">{resumeFile ? "✓ Uploaded" : "Not uploaded"}</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Courses</p>
                  <p className="font-semibold">{courses.length} added</p>
                </div>
                <div>
                  <p className="text-white/70 mb-1">Skills</p>
                  <p className="font-semibold">{skills.length} added</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border border-white/30"
              >
                Save Profile
              </button>
              <button
                onClick={handleAISearch}
                disabled={isSearching}
                className="flex-1 px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Search with AI
                  </>
                )}
              </button>
            </div>
            {searchError && (
              <p className="mt-4 text-sm text-red-100 bg-red-600/40 border border-red-200/40 rounded-lg px-4 py-3">
                {searchError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
