const API_BASE = window.location.origin;

let jobs = [];
let matchResults = [];
let selectedType = null;
let currentSort = "best";

let skillTags = [];
let courseTags = [];
let expTags = [];

let jobSearchChips = [];
let visibleJobsCount = 5;
const JOBS_PAGE_INCREMENT = 5;

const savedJobIdsServer = new Set();

function getProgressCode() {
  return localStorage.getItem("bridge_progress_code") || "";
}

function apiJsonHeaders() {
  const headers = { "Content-Type": "application/json" };
  const code = getProgressCode();
  if (code) {
    headers["X-Progress-Code"] = code;
  }
  return headers;
}

function getUserProfile() {
  return (
    JSON.parse(localStorage.getItem("userProfile")) || {
      skills: [],
      courses: [],
      projects: [],
      resume_text: "",
    }
  );
}

function saveUserProfile(profile) {
  localStorage.setItem("userProfile", JSON.stringify(profile));
}

function updateSavedCount() {
  const saved = JSON.parse(localStorage.getItem("savedJobs")) || [];
  document.getElementById("savedJobsCount").textContent = saved.length;
}

function truncateText(text, maxLen) {
  const s = String(text || "");
  if (s.length <= maxLen) {
    return s;
  }
  return `${s.slice(0, maxLen)}…`;
}

function normalizeTypeLabel(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function jobMatchesSelectedType(job) {
  if (!selectedType) {
    return true;
  }
  return normalizeTypeLabel(job.job_type) === normalizeTypeLabel(selectedType);
}

async function fetchSavedJobIdsFromServer() {
  savedJobIdsServer.clear();
  const code = getProgressCode();
  if (!code) {
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/saved-jobs`, {
      headers: { "X-Progress-Code": code },
    });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    (data.job_ids || []).forEach((id) => savedJobIdsServer.add(id));
  } catch (error) {
    console.error("saved-jobs fetch failed", error);
  }
}

function renderTagBubbles(containerId, listRef) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
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

function setupBubbleInput(inputId, containerId, listRef, onChange) {
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }

  input.addEventListener("input", () => {
    if (input.value.includes(",")) {
      const parts = input.value.split(",");

      parts.slice(0, -1).forEach((part) => {
        const value = part.trim();
        if (value && !listRef.includes(value)) {
          listRef.push(value);
        }
      });

      input.value = parts[parts.length - 1].trim();
      renderTagBubbles(containerId, listRef);
      if (onChange) {
        onChange();
      }
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const value = input.value.trim();
      if (!value) {
        return;
      }

      if (!listRef.includes(value)) {
        listRef.push(value);
      }

      input.value = "";
      renderTagBubbles(containerId, listRef);
      if (onChange) {
        onChange();
      }
    }

    if (e.key === "Backspace" && input.value.trim() === "" && listRef.length > 0) {
      listRef.pop();
      renderTagBubbles(containerId, listRef);
      if (onChange) {
        onChange();
      }
    }
  });
}

function resetVisibleJobs() {
  visibleJobsCount = JOBS_PAGE_INCREMENT;
}

async function fetchJobs() {
  try {
    const headers = {};
    const code = getProgressCode();
    if (code) {
      headers["X-Progress-Code"] = code;
    }
    const response = await fetch(`${API_BASE}/jobs?limit=5000`, { headers });
    const data = await response.json();
    jobs = data.jobs || [];
    document.getElementById("totalJobsCount").textContent = jobs.length;
  } catch (error) {
    console.error("Error fetching jobs:", error);
  }
}

async function fetchMatches(skills, courses, projects, resumeText) {
  try {
    const response = await fetch(`${API_BASE}/match`, {
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({
        skills,
        courses,
        projects,
        resume_text: (resumeText || "").trim(),
      }),
    });

    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
}

function jobHaystack(item) {
  return [
    item.title,
    item.company,
    item.location || "",
    item.description || "",
    item.job_type || "",
    (item.skills_required || []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function isJobSavedLocally(job) {
  const saved = JSON.parse(localStorage.getItem("savedJobs")) || [];
  return saved.some((j) => j.id === job.id);
}

function isJobSaved(job) {
  return savedJobIdsServer.has(job.id) || isJobSavedLocally(job);
}

async function saveJob(job) {
  const code = getProgressCode();
  if (code) {
    try {
      const response = await fetch(`${API_BASE}/saved-jobs`, {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({ job_id: job.id }),
      });
      if (response.status === 204) {
        savedJobIdsServer.add(job.id);
      }
    } catch (error) {
      console.error("save job server failed", error);
    }
  }

  let saved = JSON.parse(localStorage.getItem("savedJobs")) || [];

  if (!saved.find((j) => j.id === job.id)) {
    saved.push(job);
    localStorage.setItem("savedJobs", JSON.stringify(saved));
  }

  updateSavedCount();
}

function compareJob(job) {
  let compare = JSON.parse(localStorage.getItem("compareJobs")) || [];

  if (!compare.find((j) => j.id === job.id)) {
    compare.push(job);
    localStorage.setItem("compareJobs", JSON.stringify(compare));
    alert("Added to Compare!");
  }
}

function applyFilters(list) {
  let filtered = [...list];

  if (jobSearchChips.length) {
    filtered = filtered.filter((item) => {
      const hay = jobHaystack(item);
      return jobSearchChips.every((chip) => hay.includes(String(chip).toLowerCase()));
    });
  }

  if (selectedType) {
    filtered = filtered.filter((item) => jobMatchesSelectedType(item));
  }

  const locInput = document.getElementById("locationInput").value.trim();
  if (locInput) {
    filtered = filtered.filter((item) => (item.location || "").toLowerCase().includes(locInput.toLowerCase()));
  }

  if (currentSort === "best") {
    filtered.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }

  if (currentSort === "newest") {
    filtered.sort((a, b) => new Date(b.postedDate || 0) - new Date(a.postedDate || 0));
  }

  if (currentSort === "az") {
    filtered.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (currentSort === "za") {
    filtered.sort((a, b) => b.title.localeCompare(a.title));
  }

  return filtered;
}

function renderRecommendations() {
  const container = document.getElementById("recommendedJobs");
  container.innerHTML = "";

  const ranked = [...matchResults].sort((a, b) => b.match_score - a.match_score);
  const top3 = ranked.slice(0, 3);

  if (top3.length === 0) {
    container.innerHTML = `<p style="color:#555;">Enter skills or upload resume in Profile to see AI matches.</p>`;
    return;
  }

  top3.forEach((match) => {
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

function displayJobs() {
  const container = document.getElementById("jobList");
  const loadBtn = document.getElementById("loadMoreJobs");
  container.innerHTML = "";

  let combined = jobs.map((job) => {
    const match = matchResults.find((m) => m.job_id === job.id);

    return {
      ...job,
      match_score: match ? match.match_score : 0,
      matched_skills: match ? match.matched_skills : [],
      missing_skills: match ? match.missing_skills : [],
      explanation: match ? match.explanation : "No match data yet.",
    };
  });

  combined = applyFilters(combined);
  const total = combined.length;
  const slice = combined.slice(0, visibleJobsCount);

  document.getElementById("resultsCount").textContent = `${slice.length} of ${total} results`;

  if (loadBtn) {
    loadBtn.style.display = visibleJobsCount >= total ? "none" : "inline-block";
  }

  slice.forEach((job) => {
    const card = document.createElement("div");
    card.className = "job-card";

    card.addEventListener("click", () => openJobModal(job.id));

    const descSnippet = truncateText(job.description || "", 150);
    const jt = job.job_type || "—";
    const savedLabel = isJobSaved(job) ? "Saved ✓" : "Save";

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;">
        <div>
          <div class="job-title">${job.title}</div>
          <div class="job-company">${job.company} • ${job.location || "Location not listed"}</div>
          <div style="margin-top:6px;"><span class="tag" style="background:#ede7f6;color:#4a148c;">${jt}</span></div>
        </div>

        <div style="text-align:right;">
          <span class="tag">${job.salary_range || "Salary not listed"}</span>
          <div style="margin-top:5px;font-weight:900;color:#3a86ff;">
            ${job.match_score}% Match
          </div>
        </div>
      </div>

      <p style="margin-top:8px;font-size:0.88rem;color:#333;line-height:1.35;">${descSnippet}</p>

      <div class="job-meta">
        ${(job.skills_required || [])
          .slice(0, 4)
          .map((s) => `<span class="tag">${s}</span>`)
          .join("")}
      </div>

      <p style="margin-top:10px;font-size:0.85rem;color:#444;">
        ${job.explanation}
      </p>

      <div class="job-actions">
        <button class="save-btn">${savedLabel}</button>
        <button class="compare-btn">Compare</button>
      </div>
    `;

    const saveBtn = card.querySelector(".save-btn");
    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      saveJob(job);
      displayJobs();
    });

    card.querySelector(".compare-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      compareJob(job);
    });

    container.appendChild(card);
  });
}

function openJobModal(jobId) {
  const modal = document.getElementById("jobModal");
  const details = document.getElementById("jobDetails");

  const job = jobs.find((j) => j.id === jobId);
  const match = matchResults.find((m) => m.job_id === jobId);

  if (!job) {
    return;
  }

  const matchScore = match ? match.match_score : 0;
  const matchedSkills = match ? match.matched_skills : [];
  const missingSkills = match ? match.missing_skills : [];
  const explanation = match ? match.explanation : "No match data available.";

  const skillScore = Math.min(70, matchScore);
  const courseScore = Math.min(20, Math.max(0, matchScore - 50));
  const resumeScore = Math.min(10, Math.max(0, matchScore - 80));

  const applyLink = job.apply_link || "https://example.com/apply";
  const descBlock = job.description ? `<p style="margin:10px 0;color:#333;">${job.description}</p>` : "";

  details.innerHTML = `
    <h2>${job.title}</h2>
    <p><strong>${job.company}</strong> • ${job.location || "Location not listed"}</p>
    <p><span class="tag">${job.job_type || "Job type"}</span></p>
    ${descBlock}

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
      ${(job.skills_required || []).map((s) => `<li>${s}</li>`).join("")}
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

document.getElementById("filterBtn").addEventListener("click", async () => {
  const profile = getUserProfile();

  profile.skills = skillTags;
  profile.courses = courseTags;
  profile.projects = expTags;

  saveUserProfile(profile);

  matchResults = await fetchMatches(skillTags, courseTags, expTags, profile.resume_text || "");
  resetVisibleJobs();
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
  document.querySelectorAll(".bubble").forEach((b) => b.classList.remove("active-bubble"));

  saveUserProfile({ skills: [], courses: [], projects: [], resume_text: "" });

  matchResults = await fetchMatches([], [], [], "");
  resetVisibleJobs();
  renderRecommendations();
  displayJobs();
});

document.querySelectorAll(".bubble").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedType = btn.dataset.type;

    document.querySelectorAll(".bubble").forEach((b) => b.classList.remove("active-bubble"));
    btn.classList.add("active-bubble");

    resetVisibleJobs();
    displayJobs();
  });
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  currentSort = e.target.value;
  resetVisibleJobs();
  displayJobs();
});

const loadMoreBtn = document.getElementById("loadMoreJobs");
if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", () => {
    visibleJobsCount += JOBS_PAGE_INCREMENT;
    displayJobs();
  });
}

function onJobSearchChipsChanged() {
  resetVisibleJobs();
  displayJobs();
}

setupBubbleInput("jobSearchChipInput", "jobSearchChipBubbles", jobSearchChips, onJobSearchChipsChanged);

async function init() {
  updateSavedCount();
  await fetchSavedJobIdsFromServer();

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

  matchResults = await fetchMatches(skillTags, courseTags, expTags, profile.resume_text || "");

  renderRecommendations();
  displayJobs();
}

init();
