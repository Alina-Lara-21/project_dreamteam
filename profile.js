const API_BASE = window.location.origin;

const nameInput = document.getElementById("profileName");
const emailInput = document.getElementById("profileEmail");
const skillsHidden = document.getElementById("profileSkillsHidden");
const skillInput = document.getElementById("profileSkillInput");
const skillBubblesEl = document.getElementById("profileSkillBubbles");
const locationInput = document.getElementById("profileLocation");
const saveBtn = document.getElementById("saveProfileBtn");
const clearBtn = document.getElementById("clearProfileBtn");
const bubbles = Array.from(document.querySelectorAll(".bubble"));

const profileAvatar = document.getElementById("profileAvatar");
const profileHeaderName = document.getElementById("profileHeaderName");
const profileSaveStatus = document.getElementById("profileSaveStatus");

const profileSavedJobs = document.getElementById("profileSavedJobs");
const profileCompareJobs = document.getElementById("profileCompareJobs");
const profileTrackerJobs = document.getElementById("profileTrackerJobs");

const experienceList = document.getElementById("experienceList");
const educationList = document.getElementById("educationList");
const addExperienceBtn = document.getElementById("addExperienceBtn");
const addEducationBtn = document.getElementById("addEducationBtn");

let skillTags = [];
let experienceEntries = [];
let educationEntries = [];
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
  return String(value || "")
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
    });
    skillBubblesEl.appendChild(bubble);
  });
}

function countTrackerJobs() {
  try {
    const raw = localStorage.getItem("trackerState");
    if (!raw) return 0;
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return 0;
    return ["saved", "applied", "interview", "offer"].reduce((n, k) => {
      const arr = s[k];
      return n + (Array.isArray(arr) ? arr.length : 0);
    }, 0);
  } catch {
    return 0;
  }
}

function updateStats() {
  const savedJobs = JSON.parse(localStorage.getItem("savedJobs") || "[]");
  const compareList = JSON.parse(localStorage.getItem("compareJobs") || "[]");

  profileSavedJobs.innerText = Array.isArray(savedJobs) ? savedJobs.length : 0;
  profileCompareJobs.innerText = Array.isArray(compareList) ? compareList.length : 0;
  profileTrackerJobs.innerText = countTrackerJobs();
}

function parseExperienceJson(raw) {
  try {
    const data = JSON.parse(raw || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .map((row, i) => {
        if (!row || typeof row !== "object") return null;
        const title = String(row.title || "").trim();
        const description = String(row.description || "").trim();
        return { id: row.id != null ? String(row.id) : `exp-${i}`, title, description };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseEducationJson(raw) {
  try {
    const data = JSON.parse(raw || "[]");
    if (!Array.isArray(data)) return [];
    return data
      .map((row, i) => {
        if (!row || typeof row !== "object") return null;
        const school = String(row.school || row.program || row.course || row.label || "").trim();
        const description = String(row.description || "").trim();
        if (!school && !description) return null;
        return {
          id: row.id != null ? String(row.id) : `edu-${i}`,
          school,
          description,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function renderExperience() {
  if (!experienceList) return;
  experienceList.innerHTML = "";
  experienceEntries.forEach((entry, index) => {
    const wrap = document.createElement("div");
    wrap.className = "profile-entry-card";

    const fields = document.createElement("div");
    fields.className = "profile-entry-fields";

    const lt = document.createElement("label");
    lt.textContent = "Title";
    const titleEl = document.createElement("input");
    titleEl.type = "text";
    titleEl.className = "exp-title";
    titleEl.placeholder = "Role or project name";
    titleEl.value = entry.title;
    titleEl.addEventListener("input", () => {
      experienceEntries[index].title = titleEl.value;
    });

    const ld = document.createElement("label");
    ld.textContent = "Description";
    const descEl = document.createElement("textarea");
    descEl.className = "exp-desc";
    descEl.rows = 3;
    descEl.placeholder = "What you did";
    descEl.value = entry.description;
    descEl.addEventListener("input", () => {
      experienceEntries[index].description = descEl.value;
    });

    fields.appendChild(lt);
    fields.appendChild(titleEl);
    fields.appendChild(ld);
    fields.appendChild(descEl);

    const actions = document.createElement("div");
    actions.className = "profile-entry-actions";
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove-btn small-remove";
    rm.textContent = "Remove";
    rm.addEventListener("click", () => {
      experienceEntries.splice(index, 1);
      renderExperience();
    });
    actions.appendChild(rm);

    wrap.appendChild(fields);
    wrap.appendChild(actions);
    experienceList.appendChild(wrap);
  });
}

function renderEducation() {
  if (!educationList) return;
  educationList.innerHTML = "";
  educationEntries.forEach((entry, index) => {
    const wrap = document.createElement("div");
    wrap.className = "profile-entry-card";

    const fields = document.createElement("div");
    fields.className = "profile-entry-fields";

    const ls = document.createElement("label");
    ls.textContent = "School / program / course";
    const schoolEl = document.createElement("input");
    schoolEl.type = "text";
    schoolEl.className = "edu-school";
    schoolEl.placeholder = "e.g. State University — B.S. Computer Science";
    schoolEl.value = entry.school;
    schoolEl.addEventListener("input", () => {
      educationEntries[index].school = schoolEl.value;
    });

    const ld = document.createElement("label");
    ld.textContent = "Details (optional)";
    const descEl = document.createElement("textarea");
    descEl.className = "edu-desc";
    descEl.rows = 2;
    descEl.placeholder = "Focus, honors, relevant coursework…";
    descEl.value = entry.description || "";
    descEl.addEventListener("input", () => {
      educationEntries[index].description = descEl.value;
    });

    fields.appendChild(ls);
    fields.appendChild(schoolEl);
    fields.appendChild(ld);
    fields.appendChild(descEl);

    const actions = document.createElement("div");
    actions.className = "profile-entry-actions";
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "remove-btn small-remove";
    rm.textContent = "Remove";
    rm.addEventListener("click", () => {
      educationEntries.splice(index, 1);
      renderEducation();
    });
    actions.appendChild(rm);

    wrap.appendChild(fields);
    wrap.appendChild(actions);
    educationList.appendChild(wrap);
  });
}

function readFormPayload() {
  syncSkillsHidden();
  const expPayload = experienceEntries.map(({ title, description }) => ({
    title: String(title || "").trim(),
    description: String(description || "").trim(),
  }));
  const eduPayload = educationEntries.map(({ school, description }) => ({
    school: String(school || "").trim(),
    description: String(description || "").trim(),
  }));
  return {
    full_name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    skills: skillTags.join(", "),
    coursework: "",
    experience: "",
    location: locationInput.value.trim(),
    job_types: selectedJobTypes().join(", "),
    resume_text: "",
    experience_entries_json: JSON.stringify(expPayload),
    education_json: JSON.stringify(eduPayload),
  };
}

function applyProfileData(data) {
  nameInput.value = data.full_name || "";
  emailInput.value = data.email || "";
  skillTags = parseCsv(data.skills || "");
  renderSkillBubbles();
  syncSkillsHidden();
  locationInput.value = data.location || "";
  setActiveBubbles(data.job_types || "");
  experienceEntries = parseExperienceJson(data.experience_entries_json);
  if (!experienceEntries.length) {
    experienceEntries = [];
  }
  educationEntries = parseEducationJson(data.education_json);
  if (!educationEntries.length) {
    educationEntries = [];
  }
  renderExperience();
  renderEducation();
  updateHeader(data.full_name || "");
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
  const fields = [nameInput, emailInput, skillInput, locationInput];
  fields.forEach((el) => {
    if (el) el.disabled = locked;
  });
  bubbles.forEach((b) => {
    b.disabled = locked;
    b.style.pointerEvents = locked ? "none" : "";
  });
  if (addExperienceBtn) addExperienceBtn.disabled = locked;
  if (addEducationBtn) addEducationBtn.disabled = locked;
  experienceList?.querySelectorAll("input, textarea, button").forEach((el) => {
    el.disabled = locked;
  });
  educationList?.querySelectorAll("input, textarea, button").forEach((el) => {
    el.disabled = locked;
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
      experience_entries_json: "[]",
      education_json: "[]",
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
        experience_entries_json: "[]",
        education_json: "[]",
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
    experience_entries_json: "[]",
    education_json: "[]",
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
    }
    if (e.key === "Backspace" && skillInput.value.trim() === "" && skillTags.length > 0) {
      skillTags.pop();
      renderSkillBubbles();
      syncSkillsHidden();
    }
  });
}

function bindEvents() {
  saveBtn.addEventListener("click", saveProfile);
  clearBtn.addEventListener("click", clearProfile);
  bubbles.forEach((bubble) => {
    bubble.addEventListener("click", () => {
      if (profileLocked) return;
      bubble.classList.toggle("active");
    });
  });
  [nameInput, emailInput, locationInput].forEach((input) =>
    input.addEventListener("input", () => {
      updateHeader(nameInput.value);
    }),
  );

  addExperienceBtn?.addEventListener("click", () => {
    if (profileLocked) return;
    experienceEntries.push({ id: `exp-${Date.now()}`, title: "", description: "" });
    renderExperience();
  });
  addEducationBtn?.addEventListener("click", () => {
    if (profileLocked) return;
    educationEntries.push({ id: `edu-${Date.now()}`, school: "", description: "" });
    renderEducation();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupSkillChipInput();
  bindEvents();
  await loadProfile();
  updateStats();
});
