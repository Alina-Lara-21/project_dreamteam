//////////////////////////////////////////////////////
// BACKEND URL
//////////////////////////////////////////////////////

const API_BASE = window.__API_BASE__ || window.location.origin;

//////////////////////////////////////////////////////
// STATE
//////////////////////////////////////////////////////

let jobs = [];
let visbileJobsCount = 5; 
const JOBS_PER_PAGE = 5; 
let matchResults = [];
let selectedType = null;
let currentSearch = "";
let currentSort = "best";

let skillTags = [];
let courseTags = [];
let expTags = [];

//////////////////////////////////////////////////////
// PROFILE STORAGE
//////////////////////////////////////////////////////

function getUserProfile() {
  return JSON.parse(localStorage.getItem("userProfile")) || {
    skills: [],
    courses: [],
    projects: [],
    resume_text: ""
  };
}

function saveUserProfile(profile) {
  localStorage.setItem("userProfile", JSON.stringify(profile));
}

//////////////////////////////////////////////////////
// HELPERS
//////////////////////////////////////////////////////

function updateSavedCount() {
  const saved = JSON.parse(localStorage.getItem("savedJobs")) || [];
  document.getElementById("savedJobsCount").textContent = saved.length;
}

//////////////////////////////////////////////////////
// TAG BUBBLE SYSTEM (COMMA SUPPORT)
//////////////////////////////////////////////////////

function renderTagBubbles(containerId, listRef) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  listRef.forEach((tag, index) => {
    const bubble = document.createElement("div");
    bubble.className = "input-bubble";

    bubble.innerHTML = `
      ${tag}
      <span title="Remove">&times;</span>
    `;

    bubble.querySelector("span").addEventListener("click", () => {
      listRef.splice(index, 1);
      renderTagBubbles(containerId, listRef);
    });

    container.appendChild(bubble);
  });
}

function setupBubbleInput(inputId, containerId, listRef) {
  const input = document.getElementById(inputId);

  input.addEventListener("input", () => {
    if (input.value.includes(",")) {
      const parts = input.value.split(",");

      parts.slice(0, -1).forEach(part => {
        const value = part.trim();
        if (value && !listRef.includes(value)) {
          listRef.push(value);
        }
      });

      input.value = parts[parts.length - 1].trim();
      renderTagBubbles(containerId, listRef);
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const value = input.value.trim();
      if (!value) return;

      if (!listRef.includes(value)) {
        listRef.push(value);
      }

      input.value = "";
      renderTagBubbles(containerId, listRef);
    }

    if (e.key === "Backspace" && input.value.trim() === "" && listRef.length > 0) {
      listRef.pop();
      renderTagBubbles(containerId, listRef);
    }
  });
}

//////////////////////////////////////////////////////
// FETCH JOBS
//////////////////////////////////////////////////////

async function fetchJobs() {
  try {
    const response = await fetch(`${API_BASE}/jobs?limit=2000`);
    const data = await response.json();
    jobs = data.jobs || [];
    document.getElementById("totalJobsCount").textContent = jobs.length;
  } catch (error) {
    console.error("Error fetching jobs:", error);
  }
}

//////////////////////////////////////////////////////
// FETCH MATCHES
//////////////////////////////////////////////////////

async function fetchMatches(skills, courses, resumeText) {
  try {
    const response = await fetch(`${API_BASE}/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        skills,
        courses,
        projects: [],
        resume_text: resumeText.trim() || ""
      })
    });

    const data = await response.json();
    return data.matches || [];

  } catch (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
}

function _readInputList(primaryId, fallbackId) {
  const source = document.getElementById(primaryId) || document.getElementById(fallbackId);
  if (!source) return [];
  const raw = source.value || "";
  return raw
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function _toScore(job) {
  return Number(job.matchScore ?? job.match_score ?? 0);
}

function _toReason(job) {
  return job.matchReason || job.explanation || "Your profile partially matches this role.";
}

function _toMatchedSkills(job) {
  return job.matchedSkills || job.matched_skills || [];
}

function _toMissingSkills(job) {
  return job.missingSkills || job.missing_skills || [];
}

function _badgeColor(score) {
  if (score >= 80) return "#2e7d32";
  if (score >= 60) return "#f9a825";
  return "#c62828";
}

function renderMatchCard(job) {
  const score = _toScore(job);
  const matchedSkills = _toMatchedSkills(job);
  const missingSkills = _toMissingSkills(job);
  const reason = _toReason(job);

  return `
    <div class="recommended-card" style="border:1px solid #ececec;padding:14px;border-radius:12px;">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <h3 style="margin:0;">${job.title || "Untitled role"}</h3>
          <p style="margin:6px 0 0 0;">${job.company || "Unknown company"} • ${job.location || "Location not listed"}</p>
        </div>
        <span class="match-pill" style="background:${_badgeColor(score)};color:#fff;padding:4px 10px;border-radius:999px;font-weight:700;">
          ${score}% Match
        </span>
      </div>
      <p style="margin:10px 0 8px 0;color:#444;">${job.description || "Description not provided."}</p>
      <p style="margin:0 0 10px 0;color:#222;font-weight:600;">${reason}</p>
      <div style="margin:0 0 8px 0;">
        <strong>Matched:</strong>
        ${(matchedSkills.length ? matchedSkills : ["None"]).map(s => `<span class="tag" style="background:#e8f5e9;color:#1b5e20;margin-left:6px;">${s}</span>`).join("")}
      </div>
      <div>
        <strong>Missing:</strong>
        ${(missingSkills.length ? missingSkills : ["None"]).map(s => `<span class="tag" style="background:#fff8e1;color:#8a6d1f;margin-left:6px;">${s}</span>`).join("")}
      </div>
    </div>
  `;
}

async function findJobs() {
  const target = document.getElementById("jobResults") || document.getElementById("recommendedJobs");
  if (!target) return [];

  const payload = {
    skills: skillTags.length ? [...skillTags] : _readInputList("skills", "skillsInput"),
    courses: courseTags.length ? [...courseTags] : _readInputList("coursework", "courseworkInput"),
    projects: expTags.length ? [...expTags] : _readInputList("experience", "experienceInput")
  };

  try {
    const response = await fetch(`${API_BASE}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Match request failed: ${response.status}`);
    const data = await response.json();
    const matches = Array.isArray(data.matches) ? data.matches : [];
    target.innerHTML = matches.map(renderMatchCard).join("");
    return matches;
  } catch (error) {
    console.error("Could not run AI job match:", error);
    target.innerHTML = `<p style="color:#555;">We couldn't load AI matches right now. Please try again.</p>`;
    return [];
  }
}

//////////////////////////////////////////////////////
// SAVE + COMPARE
//////////////////////////////////////////////////////

function saveJob(job) {
  let saved = JSON.parse(localStorage.getItem("savedJobs")) || [];

  if (!saved.find(j => j.id === job.id)) {
    saved.push(job);
    localStorage.setItem("savedJobs", JSON.stringify(saved));
  }

  updateSavedCount();
}

function compareJob(job) {
  let compare = JSON.parse(localStorage.getItem("compareJobs")) || [];

  if (!compare.find(j => j.id === job.id)) {
    compare.push(job);
    localStorage.setItem("compareJobs", JSON.stringify(compare));
    alert("Added to Compare!");
  }
}

//////////////////////////////////////////////////////
// APPLY FILTERS + SORT
//////////////////////////////////////////////////////

function applyFilters(list) {
  let filtered = [...list];

  // SEARCH
  if (currentSearch) {
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(currentSearch.toLowerCase()) ||
      item.company.toLowerCase().includes(currentSearch.toLowerCase())
    );
  }

  // FILTER BY TYPE
  if (selectedType) {
    filtered = filtered.filter(item => item.type === selectedType);
  }

  // LOCATION FILTER
  const locInput = document.getElementById("locationInput").value.trim();
  if (locInput) {
    filtered = filtered.filter(item =>
      (item.location || "").toLowerCase().includes(locInput.toLowerCase())
    );
  }

  // SORTING
  if (currentSort === "best") {
    filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }

  if (currentSort === "newest") {
    filtered.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  }

  if (currentSort === "az") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (currentSort === "za") {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
  }

  return filtered;
}

//////////////////////////////////////////////////////
// RENDER AI RECOMMENDATIONS
//////////////////////////////////////////////////////

function renderRecommendations() {
  const container = document.getElementById("recommendedJobs");
  container.innerHTML = "";

  const ranked = [...matchResults].sort((a, b) => b.match_score - a.match_score);
  const top3 = ranked.slice(0, 3);

  if (top3.length === 0) {
    container.innerHTML = `<p style="color:#555;">Enter skills or upload resume in Profile to see AI matches.</p>`;
    return;
  }

  top3.forEach(match => {
    const card = document.createElement("div");
    card.className = "recommended-card";

    card.addEventListener("click", () => openJobModal(match.job_id));

    card.innerHTML = `
      <h3>${match.title}</h3>
      <p>${match.company}</p>
      <span class="match-pill">${match.match_score}% Match</span>
    `;

    container.appendChild(card);
  });
}

//////////////////////////////////////////////////////
// RENDER JOB LIST
//////////////////////////////////////////////////////

function displayJobs() {
  const container = document.getElementById("jobList");
  container.innerHTML = "";

  let combined = jobs.map(job => {
    const match = matchResults.find(m => m.job_id === job.id);

    return {
      ...job,
      match_score: match ? match.match_score : 0,
      matched_skills: match ? match.matched_skills : [],
      missing_skills: match ? match.missing_skills : [],
      explanation: match ? match.explanation : "No match data yet."
    };
  });

  combined = applyFilters(combined);

  document.getElementById("resultsCount").textContent = `${combined.length} results`;

  combined.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card";

    card.addEventListener("click", () => openJobModal(job.id));

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;">
        <div>
          <div class="job-title">${job.title}</div>
          <div class="job-company">${job.company} • ${job.location || "Location not listed"}</div>
        </div>

        <div style="text-align:right;">
          <span class="tag">${job.salary_range || "Salary not listed"}</span>
          <div style="margin-top:5px;font-weight:900;color:#3a86ff;">
            ${job.match_score}% Match
          </div>
        </div>
      </div>

      <div class="job-meta">
        ${(job.skills_required || []).slice(0, 4).map(s => `<span class="tag">${s}</span>`).join("")}
      </div>

      <p style="margin-top:10px;font-size:0.85rem;color:#444;">
        ${job.explanation}
      </p>

      <div class="job-actions">
        <button class="save-btn">Save</button>
        <button class="compare-btn">Compare</button>
      </div>
    `;

    card.querySelector(".save-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      saveJob(job);
    });

    card.querySelector(".compare-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      compareJob(job);
    });

    container.appendChild(card);
  });
}

//////////////////////////////////////////////////////
// JOB MODAL (UPDATED: WHY THIS JOB + APPLY LINK)
//////////////////////////////////////////////////////

function openJobModal(jobId) {
  const modal = document.getElementById("jobModal");
  const details = document.getElementById("jobDetails");

  const job = jobs.find(j => j.id === jobId);
  const match = matchResults.find(m => m.job_id === jobId);

  if (!job) return;

  const matchScore = match ? match.match_score : 0;
  const matchedSkills = match ? match.matched_skills : [];
  const missingSkills = match ? match.missing_skills : [];
  const explanation = match ? match.explanation : "No match data available.";

  // Breakdown estimate (visual only)
  const skillScore = Math.min(70, matchScore);
  const courseScore = Math.min(20, Math.max(0, matchScore - 50));
  const resumeScore = Math.min(10, Math.max(0, matchScore - 80));

  // TEMP APPLY LINK (for now)
  const applyLink = job.apply_link || "https://example.com/apply";

  details.innerHTML = `
    <h2>${job.title}</h2>
    <p><strong>${job.company}</strong> • ${job.location || "Location not listed"}</p>

    <div style="margin:10px 0;">
      <span class="tag">${job.salary_range || "Salary not listed"}</span>
      <span class="tag" style="background:#3a86ff;color:white;">
        ${matchScore}% Match
      </span>
    </div>

    <div class="why-card">
      <h4>Why This Job?</h4>
      <p>${explanation}</p>

      <div class="breakdown-grid">
        <div class="breakdown-box">
          <h5>Skills Match</h5>
          <span>${skillScore}%</span>
        </div>
        <div class="breakdown-box">
          <h5>Coursework Match</h5>
          <span>${courseScore}%</span>
        </div>
        <div class="breakdown-box">
          <h5>Resume Keywords</h5>
          <span>${resumeScore}%</span>
        </div>
      </div>
    </div>

    <h3>Matched Skills</h3>
    <p>${matchedSkills.length ? matchedSkills.join(", ") : "None"}</p>

    <h3>Missing Skills</h3>
    <p>${missingSkills.length ? missingSkills.join(", ") : "None"}</p>

    <h3>Required Skills</h3>
    <ul>
      ${(job.skills_required || []).map(s => `<li>${s}</li>`).join("")}
    </ul>

    <a class="apply-btn" href="${applyLink}" target="_blank">
      Apply Now
    </a>
  `;

  modal.classList.remove("hidden");
}

document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("jobModal").classList.add("hidden");
});

//////////////////////////////////////////////////////
// FILTER BUTTONS
//////////////////////////////////////////////////////

document.getElementById("filterBtn").addEventListener("click", async () => {
  const profile = getUserProfile();

  profile.skills = skillTags;
  profile.courses = courseTags;
  profile.projects = expTags;

  saveUserProfile(profile);

  matchResults = await findJobs();

  renderRecommendations();
  displayJobs();
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  skillTags = [];
  courseTags = [];
  expTags = [];

  renderTagBubbles("skillsBubbles", skillTags);
  renderTagBubbles("courseworkBubbles", courseTags);
  renderTagBubbles("experienceBubbles", expTags);

  document.getElementById("locationInput").value = "";

  selectedType = null;
  document.querySelectorAll(".bubble").forEach(b => b.classList.remove("active-bubble"));

  saveUserProfile({ skills: [], courses: [], projects: [], resume_text: "" });

  matchResults = await findJobs();

  renderRecommendations();
  displayJobs();
});

//////////////////////////////////////////////////////
// JOB TYPE BUBBLES
//////////////////////////////////////////////////////

document.querySelectorAll(".bubble").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedType = btn.dataset.type;

    document.querySelectorAll(".bubble").forEach(b => b.classList.remove("active-bubble"));
    btn.classList.add("active-bubble");

    displayJobs();
  });
});

//////////////////////////////////////////////////////
// SEARCH + SORT
//////////////////////////////////////////////////////

document.getElementById("searchBar").addEventListener("input", (e) => {
  currentSearch = e.target.value;
  displayJobs();
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  currentSort = e.target.value;
  displayJobs();
});

//////////////////////////////////////////////////////
// INIT
//////////////////////////////////////////////////////

async function init() {
  updateSavedCount();

  setupBubbleInput("skillsInput", "skillsBubbles", skillTags);
  setupBubbleInput("courseworkInput", "courseworkBubbles", courseTags);
  setupBubbleInput("experienceInput", "experienceBubbles", expTags);

  await fetchJobs();

  const profile = getUserProfile();

  skillTags = profile.skills || [];
  courseTags = profile.courses || [];
  expTags = profile.projects || [];

  renderTagBubbles("skillsBubbles", skillTags);
  renderTagBubbles("courseworkBubbles", courseTags);
  renderTagBubbles("experienceBubbles", expTags);

  matchResults = await findJobs();

  renderRecommendations();
  displayJobs();
}

init();