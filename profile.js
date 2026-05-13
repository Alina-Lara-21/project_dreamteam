const API_BASE = window.location.origin;

const nameInput = document.getElementById("profileName");
const emailInput = document.getElementById("profileEmail");
const skillsHidden = document.getElementById("profileSkillsHidden");
const skillInput = document.getElementById("profileSkillInput");
const skillBubblesEl = document.getElementById("profileSkillBubbles");
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
const profileSaveStatus = document.getElementById("profileSaveStatus");

const profileSavedJobs = document.getElementById("profileSavedJobs");
const profileCompareJobs = document.getElementById("profileCompareJobs");
const profileTrackerJobs = document.getElementById("profileTrackerJobs");

let skillTags = [];
let profileLocked = false;

function getProgressCode() {
  return localStorage.getItem("bridge_progress_code") || "";
}

function apiHeaders(extra = {}) {
  const headers = { ...extra };
  const code = getProgressCode();
  if (code) {
    headers["X-Progress-Code"] = code;
  }
  if (!headers["Content-Type"] && !(extra instanceof FormData)) {
    headers["Content-Type"] = "application/json";
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

function syncSkillsHidden() {
  if (skillsHidden) {
    skillsHidden.value = skillTags.join(", ");
  }
}

function renderSkillBubbles() {
  if (!skillBubblesEl) return;
  skillBubblesEl.innerHTML = "";
  skillTags.forEach((tag, index) => {
    const bubble = document.createElement("div");
    bubble.className = "input-bubble";
    bubble.innerHTML = `${tag}<span title="Remove">&times;</span>`;
    bubble.querySelector("span").addEventListener("click", () => {
      skillTags.splice(index, 1);
      renderSkillBubbles();
      syncSkillsHidden();
      updateProgress();
    });
    skillBubblesEl.appendChild(bubble);
  });
}

function updateProgress() {
  const fields = [
    nameInput.value,
    emailInput.value,
    skillTags.join(", "),
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
  const compareList = JSON.parse(localStorage.getItem("compareJobs") || "[]");
  const trackerJobs = JSON.parse(localStorage.getItem("trackerJobs") || "[]");

  profileSavedJobs.innerText = Array.isArray(savedJobs) ? savedJobs.length : 0;
  profileCompareJobs.innerText = Array.isArray(compareList) ? compareList.length : 0;
  profileTrackerJobs.innerText = Array.isArray(trackerJobs) ? trackerJobs.length : 0;
}

function readFormPayload() {
  syncSkillsHidden();
  return {
    full_name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    skills: skillTags.join(", "),
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
  skillTags = parseCsv(data.skills || "");
  renderSkillBubbles();
  syncSkillsHidden();
  courseworkInput.value = data.coursework || "";
  experienceInput.value = data.experience || "";
  locationInput.value = data.location || "";
  resumePreview.value = data.resume_text || "";
  setActiveBubbles(data.job_types || "");
  updateHeader(data.full_name || "");
  updateProgress();
}

async function resumeProgressIfStored() {
  const code = getProgressCode();
  if (!code) {
    return false;
  }
  const response = await fetch(`${API_BASE}/progress/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ progress_code: code }),
  });
  if (!response.ok) {
    localStorage.removeItem("bridge_progress_code");
    return false;
  }
  return true;
}

async function ensureProgressSession() {
  if (await resumeProgressIfStored()) {
    return true;
  }
  const name = nameInput.value.trim() || "Bridge User";
  const email = emailInput.value.trim() || "bridge.user@example.com";
  const response = await fetch(`${API_BASE}/progress/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ display_name: name, email }),
  });
  if (!response.ok) {
    return false;
  }
  const data = await response.json();
  localStorage.setItem("bridge_progress_code", data.progress_code);
  return true;
}

function setProfileLocked(locked) {
  profileLocked = locked;
  const fields = [nameInput, emailInput, skillInput, courseworkInput, experienceInput, locationInput, resumeUpload, resumePreview];
  fields.forEach((el) => {
    if (el) el.disabled = locked;
  });
  bubbles.forEach((b) => {
    b.disabled = locked;
    b.style.pointerEvents = locked ? "none" : "";
  });
  clearBtn.innerText = locked ? "Edit Profile" : "Clear Profile";
}

async function loadProfile() {
  profileSaveStatus.innerText = "";
  const code = getProgressCode();
  if (!code) {
    applyProfileData({
      full_name: "",
      email: "",
      skills: "",
      coursework: "",
      experience: "",
      location: "",
      job_types: "",
      resume_text: "",
    });
    setProfileLocked(false);
    return;
  }
  try {
    const resumed = await resumeProgressIfStored();
    if (!resumed) {
      applyProfileData({
        full_name: "",
        email: "",
        skills: "",
        coursework: "",
        experience: "",
        location: "",
        job_types: "",
        resume_text: "",
      });
      setProfileLocked(false);
      return;
    }
    const response = await fetch(`${API_BASE}/profile/data`, {
      method: "GET",
      headers: apiHeaders(),
    });
    if (!response.ok) {
      throw new Error(`load profile failed: ${response.status}`);
    }
    const data = await response.json();
    applyProfileData(data);
    setProfileLocked(false);
  } catch (error) {
    console.error("Failed to load profile data:", error);
    updateHeader(nameInput.value);
    updateProgress();
    setProfileLocked(false);
  }
}

async function saveProfile() {
  profileSaveStatus.innerText = "";
  try {
    if (!(await ensureProgressSession())) {
      throw new Error("could not start session");
    }
    const payload = readFormPayload();
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
    profileSaveStatus.innerText = "Profile Saved ✓";
    setProfileLocked(true);
  } catch (error) {
    console.error("Failed to save profile data:", error);
  }
}

async function clearProfile() {
  if (profileLocked) {
    profileSaveStatus.innerText = "";
    setProfileLocked(false);
    return;
  }
  profileSaveStatus.innerText = "";
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
    if (!getProgressCode()) {
      applyProfileData(empty);
      skillTags = [];
      renderSkillBubbles();
      return;
    }
    if (!(await ensureProgressSession())) {
      applyProfileData(empty);
      skillTags = [];
      renderSkillBubbles();
      return;
    }
    const response = await fetch(`${API_BASE}/profile/data`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(empty),
    });
    if (!response.ok) {
      throw new Error(`clear profile failed: ${response.status}`);
    }
    applyProfileData(empty);
    skillTags = [];
    renderSkillBubbles();
  } catch (error) {
    console.error("Failed to clear profile data:", error);
  }
}

function setupSkillChipInput() {
  if (!skillInput) return;
  skillInput.addEventListener("input", () => {
    if (skillInput.value.includes(",")) {
      const parts = skillInput.value.split(",");
      parts.slice(0, -1).forEach((part) => {
        const value = part.trim();
        if (value && !skillTags.includes(value)) {
          skillTags.push(value);
        }
      });
      skillInput.value = parts[parts.length - 1].trim();
      renderSkillBubbles();
      syncSkillsHidden();
      updateProgress();
    }
  });
  skillInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = skillInput.value.trim();
      if (value && !skillTags.includes(value)) {
        skillTags.push(value);
      }
      skillInput.value = "";
      renderSkillBubbles();
      syncSkillsHidden();
      updateProgress();
    }
    if (e.key === "Backspace" && skillInput.value.trim() === "" && skillTags.length > 0) {
      skillTags.pop();
      renderSkillBubbles();
      syncSkillsHidden();
      updateProgress();
    }
  });
}

async function handleResumeUpload() {
  const file = resumeUpload.files && resumeUpload.files[0];
  if (!file) return;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    try {
      if (!(await ensureProgressSession())) {
        console.error("Resume upload needs an active session.");
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      const headers = {};
      const code = getProgressCode();
      if (code) headers["X-Progress-Code"] = code;
      const response = await fetch(`${API_BASE}/profile/resume`, {
        method: "POST",
        headers,
        body: fd,
      });
      if (!response.ok) {
        throw new Error(`resume parse failed: ${response.status}`);
      }
      const data = await response.json();
      const found = Array.isArray(data.skills) ? data.skills : [];
      found.forEach((s) => {
        const v = String(s).trim().toLowerCase();
        if (v && !skillTags.includes(v)) {
          skillTags.push(v);
        }
      });
      renderSkillBubbles();
      syncSkillsHidden();
      updateProgress();
    } catch (error) {
      console.error(error);
    }
    return;
  }
  if (!lower.endsWith(".txt")) {
    console.error("Resume upload rejected: use .pdf or .txt.");
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
      if (profileLocked) return;
      bubble.classList.toggle("active");
      updateProgress();
    });
  });
  [nameInput, emailInput, courseworkInput, experienceInput, locationInput, resumePreview].forEach((input) =>
    input.addEventListener("input", () => {
      updateHeader(nameInput.value);
      updateProgress();
    }),
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  setupSkillChipInput();
  bindEvents();
  await loadProfile();
  updateStats();
});
