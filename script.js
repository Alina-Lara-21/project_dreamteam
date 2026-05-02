//////////////////////////////////////////////////////
// BACKEND URL
//////////////////////////////////////////////////////

const API_BASE = "http://127.0.0.1:8000";

//////////////////////////////////////////////////////
// STATE
//////////////////////////////////////////////////////

let jobs = [];
let matchResults = [];
let selectedType = null;
let currentSearch = "";
let currentSort = "best";

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

function parseCommaList(text) {
  return (text || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function updateSavedCount() {
  const saved = JSON.parse(localStorage.getItem("savedJobs")) || [];
  document.getElementById("savedJobsCount").textContent = saved.length;
}

//////////////////////////////////////////////////////
// FETCH JOBS
//////////////////////////////////////////////////////

async function fetchJobs() {
  try {
    const response = await fetch(`${API_BASE}/jobs`);
    const data = await response.json();
    jobs = data.jobs || [];
    document.getElementById("totalJobsCount").textContent = jobs.length;
  } catch (error) {
    console.error("Error fetching jobs:", error);
  }
}

//////////////////////////////////////////////////////
// FETCH MATCHES (BACKEND AI MATCHER)
//////////////////////////////////////////////////////

async function fetchMatches(skills, courses, resumeText) {
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

  // Merge match results with job data
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
        ${job.matched_skills.slice(0, 4).map(s => `<span class="tag">${s}</span>`).join("")}
      </div>

      <p style="margin-top:10px;font-size:0.85rem;color:#444;">
        ${job.explanation}
      </p>

      <div class="job-actions">
        <button class="save-btn">Save</button>
        <button class="compare-btn">Compare</button>
      </div>
    `;

    const saveBtn = card.querySelector(".save-btn");
    const compareBtn = card.querySelector(".compare-btn");

    saveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      saveJob(job);
    });

    compareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      compareJob(job);
    });

    container.appendChild(card);
  });
}

//////////////////////////////////////////////////////
// JOB MODAL
//////////////////////////////////////////////////////

function openJobModal(jobId) {
  const modal = document.getElementById("jobModal");
  const details = document.getElementById("jobDetails");

  const job = jobs.find(j => j.id === jobId);
  const match = matchResults.find(m => m.job_id === jobId);

  if (!job) return;

  details.innerHTML = `
    <h2>${job.title}</h2>
    <p><strong>${job.company}</strong> • ${job.location || "Location not listed"}</p>

    <div style="margin:10px 0;">
      <span class="tag">${job.salary_range || "Salary not listed"}</span>
      <span class="tag" style="background:#3a86ff;color:white;">
        ${match ? match.match_score : 0}% Match
      </span>
    </div>

    <hr style="margin:15px 0;">

    <h3>AI Explanation</h3>
    <p>${match ? match.explanation : "No match data available."}</p>

    <h3>Matched Skills</h3>
    <p>${match && match.matched_skills.length ? match.matched_skills.join(", ") : "None"}</p>

    <h3>Missing Skills</h3>
    <p>${match && match.missing_skills.length ? match.missing_skills.join(", ") : "None"}</p>

    <h3>Job Requirements</h3>
    <ul>
      ${(job.skills_required || []).map(s => `<li>${s}</li>`).join("")}
    </ul>

    <button class="primary" style="width:100%;margin-top:15px;"
      onclick='saveJob(${JSON.stringify(job)})'>
      Save Job
    </button>
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
  const skills = parseCommaList(document.getElementById("skillsInput").value);
  const courses = parseCommaList(document.getElementById("courseworkInput").value);
  const projects = parseCommaList(document.getElementById("experienceInput").value);

  const profile = getUserProfile();
  profile.skills = skills;
  profile.courses = courses;
  profile.projects = projects;

  saveUserProfile(profile);

  matchResults = await fetchMatches(skills, courses, profile.resume_text || "");

  renderRecommendations();
  displayJobs();
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  document.getElementById("skillsInput").value = "";
  document.getElementById("courseworkInput").value = "";
  document.getElementById("experienceInput").value = "";
  document.getElementById("locationInput").value = "";

  selectedType = null;
  document.querySelectorAll(".bubble").forEach(b => b.classList.remove("active-bubble"));

  saveUserProfile({ skills: [], courses: [], projects: [], resume_text: "" });

  matchResults = await fetchMatches([], [], "");

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
  await fetchJobs();

  const profile = getUserProfile();
  matchResults = await fetchMatches(profile.skills, profile.courses, profile.resume_text || "");

  renderRecommendations();
  displayJobs();
}

init();