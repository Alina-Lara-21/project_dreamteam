const nameInput = document.getElementById("profileName");
const emailInput = document.getElementById("profileEmail");
const skillsInput = document.getElementById("profileSkills");
const courseworkInput = document.getElementById("profileCoursework");
const experienceInput = document.getElementById("profileExperience");
const locationInput = document.getElementById("profileLocation");

const resumeUpload = document.getElementById("resumeUpload");
const resumePreview = document.getElementById("resumePreview");

const saveBtn = document.getElementById("saveProfileBtn");
const clearBtn = document.getElementById("clearProfileBtn");

const bubbles = document.querySelectorAll(".bubble");
let selectedTypes = [];

// Header elements
const profileAvatar = document.getElementById("profileAvatar");
const profileHeaderName = document.getElementById("profileHeaderName");
const profilePercent = document.getElementById("profilePercent");
const progressFill = document.getElementById("progressFill");

// Stats elements
const profileSavedJobs = document.getElementById("profileSavedJobs");
const profileCompareJobs = document.getElementById("profileCompareJobs");
const profileTrackerJobs = document.getElementById("profileTrackerJobs");

// ------------------------------
// Extract keywords from resume
// ------------------------------
function extractSkillsFromResume(text) {
  const keywords = [
    "Python", "Java", "C++", "C#", "JavaScript", "HTML", "CSS", "React",
    "Node.js", "SQL", "MongoDB", "AWS", "Linux", "Git", "Docker",
    "Networking", "Cybersecurity", "Machine Learning", "Excel", "Figma",
    "API", "CI/CD", "Unity", "Data Structures", "Operating Systems"
  ];

  let found = [];

  keywords.forEach(skill => {
    if (text.toLowerCase().includes(skill.toLowerCase())) {
      found.push(skill);
    }
  });

  return found;
}

// ------------------------------
// Update Profile Completion
// ------------------------------
function updateProfileProgress() {
  let filled = 0;
  let total = 6;

  if (nameInput.value.trim() !== "") filled++;
  if (emailInput.value.trim() !== "") filled++;
  if (skillsInput.value.trim() !== "") filled++;
  if (courseworkInput.value.trim() !== "") filled++;
  if (experienceInput.value.trim() !== "") filled++;
  if (locationInput.value.trim() !== "") filled++;

  const percent = Math.round((filled / total) * 100);

  profilePercent.innerText = `${percent}%`;
  progressFill.style.width = `${percent}%`;
}

// ------------------------------
// Update Avatar + Header Name
// ------------------------------
function updateProfileHeader() {
  const name = nameInput.value.trim();

  if (name !== "") {
    profileHeaderName.innerText = name;

    const initials = name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    profileAvatar.innerText = initials;
  } else {
    profileHeaderName.innerText = "My Profile";
    profileAvatar.innerText = "U";
  }
}

// ------------------------------
// Update Stats Counts
// ------------------------------
function updateProfileStats() {
  const savedJobs = JSON.parse(localStorage.getItem("savedJobs")) || [];
  const compareJobs = JSON.parse(localStorage.getItem("compareJobs")) || [];

  const tracker = JSON.parse(localStorage.getItem("tracker")) || {
    saved: [],
    applied: [],
    interview: [],
    offer: []
  };

  const totalTracker =
    tracker.saved.length +
    tracker.applied.length +
    tracker.interview.length +
    tracker.offer.length;

  profileSavedJobs.innerText = savedJobs.length;
  profileCompareJobs.innerText = compareJobs.length;
  profileTrackerJobs.innerText = totalTracker;
}

// ------------------------------
// Load profile
// ------------------------------
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("userProfile"));
  if (!profile) return;

  nameInput.value = profile.name || "";
  emailInput.value = profile.email || "";
  skillsInput.value = profile.skills || "";
  courseworkInput.value = profile.coursework || "";
  experienceInput.value = profile.experience || "";
  locationInput.value = profile.location || "";

  resumePreview.value = profile.resumeText || "";

  selectedTypes = profile.types || [];

  bubbles.forEach(bubble => {
    const type = bubble.dataset.type;
    if (selectedTypes.includes(type)) {
      bubble.classList.add("active");
    } else {
      bubble.classList.remove("active");
    }
  });

  updateProfileHeader();
  updateProfileProgress();
  updateProfileStats();
}

// ------------------------------
// Save profile
// ------------------------------
function saveProfile() {
  const profile = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    skills: skillsInput.value.trim(),
    coursework: courseworkInput.value.trim(),
    experience: experienceInput.value.trim(),
    location: locationInput.value.trim(),
    types: selectedTypes,
    resumeText: resumePreview.value.trim()
  };

  localStorage.setItem("userProfile", JSON.stringify(profile));
  updateProfileHeader();
  updateProfileProgress();

  alert("Profile saved!");
}

// ------------------------------
// Clear profile
// ------------------------------
function clearProfile() {
  localStorage.removeItem("userProfile");

  nameInput.value = "";
  emailInput.value = "";
  skillsInput.value = "";
  courseworkInput.value = "";
  experienceInput.value = "";
  locationInput.value = "";
  resumePreview.value = "";

  selectedTypes = [];
  bubbles.forEach(b => b.classList.remove("active"));

  updateProfileHeader();
  updateProfileProgress();
  updateProfileStats();

  alert("Profile cleared.");
}

// ------------------------------
// Bubble Logic
// ------------------------------
bubbles.forEach(bubble => {
  bubble.addEventListener("click", () => {
    const type = bubble.dataset.type;

    if (selectedTypes.includes(type)) {
      selectedTypes = selectedTypes.filter(t => t !== type);
      bubble.classList.remove("active");
    } else {
      selectedTypes.push(type);
      bubble.classList.add("active");
    }

    updateProfileProgress();
  });
});

// ------------------------------
// Resume Upload
// ------------------------------
if (resumeUpload) {
  resumeUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
      const resumeText = e.target.result;
      resumePreview.value = resumeText;

      const extractedSkills = extractSkillsFromResume(resumeText);

      if (extractedSkills.length > 0) {
        const existingSkills = skillsInput.value
          .split(",")
          .map(s => s.trim())
          .filter(Boolean);

        extractedSkills.forEach(skill => {
          if (!existingSkills.includes(skill)) {
            existingSkills.push(skill);
          }
        });

        skillsInput.value = existingSkills.join(", ");
      }

      updateProfileProgress();
      alert("Resume uploaded! Skills were extracted automatically.");
    };

    reader.readAsText(file);
  });
}

// ------------------------------
// Live Updates
// ------------------------------
[nameInput, emailInput, skillsInput, courseworkInput, experienceInput, locationInput].forEach(input => {
  input.addEventListener("input", () => {
    updateProfileHeader();
    updateProfileProgress();
  });
});

// ------------------------------
// Button Events
// ------------------------------
saveBtn.addEventListener("click", saveProfile);
clearBtn.addEventListener("click", clearProfile);

// ------------------------------
// Initial Load
// ------------------------------
loadProfile();
updateProfileStats();
updateProfileProgress();
updateProfileHeader();