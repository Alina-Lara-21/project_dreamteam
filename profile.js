const API_BASE = window.location.origin;

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
const bubbles = Array.from(document.querySelectorAll(".bubble"));

const profileAvatar = document.getElementById("profileAvatar");
const profileHeaderName = document.getElementById("profileHeaderName");
const profilePercent = document.getElementById("profilePercent");
const progressFill = document.getElementById("progressFill");

const profileSavedJobs = document.getElementById("profileSavedJobs");
const profileCompareJobs = document.getElementById("profileCompareJobs");
const profileTrackerJobs = document.getElementById("profileTrackerJobs");

function getProgressCode() {
  return localStorage.getItem("bridge_progress_code") || "";
}

function apiHeaders() {
  const headers = { "Content-Type": "application/json" };
  const code = getProgressCode();
  if (code) {
    headers["X-Progress-Code"] = code;
  }
  return headers;
}

function parseCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function selectedJobTypes() {
  return bubbles
    .filter((bubble) => bubble.classList.contains("active"))
    .map((bubble) => bubble.dataset.type)
    .filter(Boolean);
}

function setActiveBubbles(jobTypesCsv) {
  const active = new Set(parseCsv(jobTypesCsv));
  bubbles.forEach((bubble) => {
    if (active.has(bubble.dataset.type)) {
      bubble.classList.add("active");
    } else {
      bubble.classList.remove("active");
    }
  });
}

function updateHeader(fullName) {
  const clean = (fullName || "").trim();
  if (clean) {
    profileHeaderName.innerText = clean;
    profileAvatar.innerText = clean[0].toUpperCase();
  } else {
    profileHeaderName.innerText = "My Profile";
    profileAvatar.innerText = "U";
  }
}

function updateProgress() {
  const fields = [
    nameInput.value,
    emailInput.value,
    skillsInput.value,
    courseworkInput.value,
    experienceInput.value,
    resumePreview.value,
  ];
  const filled = fields.filter((value) => String(value || "").trim() !== "").length;
  const percent = Math.round((filled / 6) * 100);
  profilePercent.innerText = `${filled}/6 fields (${percent}%)`;
  progressFill.style.width = `${percent}%`;
}

function updateStats() {
  const savedJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
  const compareList = JSON.parse(localStorage.getItem("compareList") || "[]");
  const trackerJobs = JSON.parse(localStorage.getItem("trackerJobs") || "[]");

  profileSavedJobs.innerText = Array.isArray(savedJobs) ? savedJobs.length : 0;
  profileCompareJobs.innerText = Array.isArray(compareList) ? compareList.length : 0;
  profileTrackerJobs.innerText = Array.isArray(trackerJobs) ? trackerJobs.length : 0;
}

function readFormPayload() {
  return {
    full_name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    skills: skillsInput.value.trim(),
    coursework: courseworkInput.value.trim(),
    experience: experienceInput.value.trim(),
    location: locationInput.value.trim(),
    job_types: selectedJobTypes().join(", "),
    resume_text: resumePreview.value.trim(),
  };
}

function applyProfileData(data) {
  nameInput.value = data.full_name || "";
  emailInput.value = data.email || "";
  skillsInput.value = data.skills || "";
  courseworkInput.value = data.coursework || "";
  experienceInput.value = data.experience || "";
  locationInput.value = data.location || "";
  resumePreview.value = data.resume_text || "";
  setActiveBubbles(data.job_types || "");
  updateHeader(data.full_name || "");
  updateProgress();
}

async function loadProfile() {
  try {
    const response = await fetch(`${API_BASE}/profile/data`, {
      method: "GET",
      headers: apiHeaders(),
    });
    if (!response.ok) {
      throw new Error(`load profile failed: ${response.status}`);
    }
    const data = await response.json();
    applyProfileData(data);
  } catch (error) {
    console.error("Failed to load profile data:", error);
    updateHeader(nameInput.value);
    updateProgress();
  }
}

async function saveProfile() {
  const payload = readFormPayload();
  try {
    const response = await fetch(`${API_BASE}/profile/data`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`save profile failed: ${response.status}`);
    }
    const saved = await response.json();
    applyProfileData(saved);
  } catch (error) {
    console.error("Failed to save profile data:", error);
  }
}

async function clearProfile() {
  const empty = {
    full_name: "",
    email: "",
    skills: "",
    coursework: "",
    experience: "",
    location: "",
    job_types: "",
    resume_text: "",
  };
  try {
    const response = await fetch(`${API_BASE}/profile/data`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(empty),
    });
    if (!response.ok) {
      throw new Error(`clear profile failed: ${response.status}`);
    }
    applyProfileData(empty);
  } catch (error) {
    console.error("Failed to clear profile data:", error);
  }
}

function handleResumeUpload() {
  const file = resumeUpload.files && resumeUpload.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".txt")) {
    console.error("Resume upload rejected: only .txt files are supported.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    resumePreview.value = String(event.target?.result || "");
    updateProgress();
  };
  reader.readAsText(file);
}

function bindEvents() {
  saveBtn.addEventListener("click", saveProfile);
  clearBtn.addEventListener("click", clearProfile);
  resumeUpload.addEventListener("change", handleResumeUpload);
  bubbles.forEach((bubble) => {
    bubble.addEventListener("click", () => {
      bubble.classList.toggle("active");
      updateProgress();
    });
  });
  [nameInput, emailInput, skillsInput, courseworkInput, experienceInput, resumePreview].forEach(
    (input) => input.addEventListener("input", () => {
      updateHeader(nameInput.value);
      updateProgress();
    }),
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadProfile();
  updateStats();
});
