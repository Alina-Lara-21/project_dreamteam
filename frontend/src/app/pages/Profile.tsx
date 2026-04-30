import { User, Mail, MapPin, Briefcase, FileText, Settings } from "lucide-react";
import { useState } from "react";

interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  description: string;
}

interface EducationItem {
  degree: string;
  school: string;
  details: string;
}

export function Profile() {
  const [profile, setProfile] = useState({
    name: "John Doe",
    title: "Full Stack Developer",
    email: "john.doe@email.com",
    location: "Austin, TX",
    yearsExperience: "5+ years experience",
    about:
      "Passionate full-stack developer with 5+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud technologies. Always eager to learn new technologies and solve challenging problems.",
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "Docker", "Git", "REST APIs", "GraphQL", "Tailwind CSS"],
    experience: [
      {
        role: "Senior Software Engineer",
        company: "Tech Company Inc.",
        period: "2022 - Present",
        description: "Leading development of customer-facing web applications, mentoring junior developers, and architecting scalable solutions.",
      },
      {
        role: "Full Stack Developer",
        company: "Startup Co.",
        period: "2019 - 2022",
        description: "Built and maintained full-stack applications using React and Node.js, collaborated with cross-functional teams.",
      },
    ] as ExperienceItem[],
    education: {
      degree: "Bachelor of Science in Computer Science",
      school: "University of Texas at Austin • 2015 - 2019",
      details: "Graduated with honors, focused on software engineering and web development.",
    } as EducationItem,
  });

  const [draft, setDraft] = useState(profile);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [skillsInput, setSkillsInput] = useState(profile.skills.join(", "));

  const saveProfileCard = () => {
    setProfile((prev) => ({
      ...prev,
      name: draft.name,
      title: draft.title,
      email: draft.email,
      location: draft.location,
      yearsExperience: draft.yearsExperience,
    }));
    setIsEditingProfile(false);
  };

  const saveAbout = () => {
    setProfile((prev) => ({ ...prev, about: draft.about }));
    setIsEditingAbout(false);
  };

  const saveSkills = () => {
    const nextSkills = skillsInput
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    setProfile((prev) => ({ ...prev, skills: nextSkills }));
    setDraft((prev) => ({ ...prev, skills: nextSkills }));
    setIsEditingSkills(false);
  };

  const saveExperience = () => {
    setProfile((prev) => ({ ...prev, experience: draft.experience }));
    setIsEditingExperience(false);
  };

  const saveEducation = () => {
    setProfile((prev) => ({ ...prev, education: draft.education }));
    setIsEditingEducation(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-[#5b7bd5] to-[#7c9df5] text-white px-6 py-12">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="mb-2">Profile</h1>
          <p className="text-white/90">Manage your account and preferences</p>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  {isEditingProfile ? (
                    <div className="w-full space-y-2">
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="mb-1">{profile.name}</h2>
                      <p className="text-gray-600">{profile.title}</p>
                    </>
                  )}
                </div>

                <div className="space-y-3 text-sm border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-3 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {isEditingProfile ? (
                      <input
                        value={draft.email}
                        onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1"
                      />
                    ) : (
                      profile.email
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {isEditingProfile ? (
                      <input
                        value={draft.location}
                        onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1"
                      />
                    ) : (
                      profile.location
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    {isEditingProfile ? (
                      <input
                        value={draft.yearsExperience}
                        onChange={(e) => setDraft((prev) => ({ ...prev, yearsExperience: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1"
                      />
                    ) : (
                      profile.yearsExperience
                    )}
                  </div>
                </div>

                {isEditingProfile ? (
                  <div className="grid grid-cols-2 gap-2 mt-6">
                    <button
                      onClick={() => {
                        setDraft(profile);
                        setIsEditingProfile(false);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveProfileCard}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full mt-6 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                <h3 className="mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Applications</span>
                    <span className="font-semibold text-blue-600">12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Saved Jobs</span>
                    <span className="font-semibold text-blue-600">8</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profile Views</span>
                    <span className="font-semibold text-blue-600">124</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2>About Me</h2>
                  {isEditingAbout ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDraft((prev) => ({ ...prev, about: profile.about }));
                          setIsEditingAbout(false);
                        }}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button onClick={saveAbout} className="text-blue-600 hover:text-blue-700">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsEditingAbout(true)} className="text-blue-600 hover:text-blue-700">Edit</button>
                  )}
                </div>
                {isEditingAbout ? (
                  <textarea
                    value={draft.about}
                    onChange={(e) => setDraft((prev) => ({ ...prev, about: e.target.value }))}
                    className="w-full min-h-[120px] border border-gray-300 rounded-lg px-4 py-3"
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">{profile.about}</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2>Skills</h2>
                  {isEditingSkills ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSkillsInput(profile.skills.join(", "));
                          setIsEditingSkills(false);
                        }}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button onClick={saveSkills} className="text-blue-600 hover:text-blue-700">Save</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSkillsInput(profile.skills.join(", "));
                        setIsEditingSkills(true);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditingSkills ? (
                  <textarea
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    className="w-full min-h-[100px] border border-gray-300 rounded-lg px-4 py-3"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2>Experience</h2>
                  {isEditingExperience ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDraft((prev) => ({ ...prev, experience: profile.experience }));
                          setIsEditingExperience(false);
                        }}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button onClick={saveExperience} className="text-blue-600 hover:text-blue-700">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsEditingExperience(true)} className="text-blue-600 hover:text-blue-700">Edit</button>
                  )}
                </div>
                <div className="space-y-6">
                  {draft.experience.map((item, index) => (
                    <div className="flex gap-4" key={`${item.role}-${index}`}>
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        {isEditingExperience ? (
                          <>
                            <input
                              value={item.role}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  experience: prev.experience.map((exp, expIndex) =>
                                    expIndex === index ? { ...exp, role: e.target.value } : exp
                                  ),
                                }))
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                            <input
                              value={`${item.company} • ${item.period}`}
                              onChange={(e) => {
                                const [company, period] = e.target.value.split("•").map((part) => part.trim());
                                setDraft((prev) => ({
                                  ...prev,
                                  experience: prev.experience.map((exp, expIndex) =>
                                    expIndex === index
                                      ? { ...exp, company: company || exp.company, period: period || exp.period }
                                      : exp
                                  ),
                                }));
                              }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                            <textarea
                              value={item.description}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  experience: prev.experience.map((exp, expIndex) =>
                                    expIndex === index ? { ...exp, description: e.target.value } : exp
                                  ),
                                }))
                              }
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </>
                        ) : (
                          <>
                            <h3>{item.role}</h3>
                            <p className="text-gray-600 mb-2">{item.company} • {item.period}</p>
                            <p className="text-gray-700 text-sm">{item.description}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2>Education</h2>
                  {isEditingEducation ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDraft((prev) => ({ ...prev, education: profile.education }));
                          setIsEditingEducation(false);
                        }}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                      <button onClick={saveEducation} className="text-blue-600 hover:text-blue-700">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsEditingEducation(true)} className="text-blue-600 hover:text-blue-700">Edit</button>
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {isEditingEducation ? (
                      <>
                        <input
                          value={draft.education.degree}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              education: { ...prev.education, degree: e.target.value },
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <input
                          value={draft.education.school}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              education: { ...prev.education, school: e.target.value },
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <textarea
                          value={draft.education.details}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              education: { ...prev.education, details: e.target.value },
                            }))
                          }
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </>
                    ) : (
                      <>
                        <h3>{profile.education.degree}</h3>
                        <p className="text-gray-600 mb-2">{profile.education.school}</p>
                        <p className="text-gray-700 text-sm">{profile.education.details}</p>
                      </>
                    )}
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
