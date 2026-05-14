const API_BASE = window.location.origin;

const JOB_CATEGORIES = [
  {
    id: "ai",
    label: "AI & Machine Learning",
    keys: ["machine learning", "deep learning", "llm", "nlp", "tensorflow", "pytorch", "neural net", "computer vision", " ai ", "ml "],
  },
  {
    id: "data",
    label: "Data & Analytics",
    keys: ["data analyst", "data engineer", "analytics", "business intelligence", "sql", "warehouse", "etl", "tableau", "power bi"],
  },
  {
    id: "pm",
    label: "Project Management",
    keys: ["project manager", "program manager", "scrum", "agile", "pmp", "delivery manager"],
  },
  {
    id: "ops",
    label: "Operations & Support",
    keys: ["operations", "customer support", "help desk", "technical support", "service desk", "it support"],
  },
  {
    id: "sw",
    label: "Software Development",
    keys: ["software engineer", "developer", "backend", "frontend", "full stack", "devops", "sre", "java", "python", "react", "node"],
  },
  {
    id: "ux",
    label: "Design & UX",
    keys: ["ux", "ui ", "product design", "figma", "graphic design", "designer"],
  },
  {
    id: "mkt",
    label: "Marketing",
    keys: ["marketing", "seo", "content", "social media", "growth", "brand"],
  },
  {
    id: "fin",
    label: "Finance",
    keys: ["finance", "accounting", "financial", "controller", "fp&a", "audit"],
  },
  {
    id: "sales",
    label: "Sales",
    keys: ["sales", "account executive", "business development", "bdr", "sdr"],
  },
  {
    id: "it",
    label: "IT",
    keys: ["network", "sysadmin", "systems administrator", "infrastructure", "cybersecurity", "security engineer"],
  },
];

let jobs = [];
let matchResults = [];
let selectedType = null;
let currentSort = "best";

let jobTitleTags = [];
const selectedCategoryLabels = new Set();

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

function parseCsvSkills(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function updateSavedCount() {
  const saved = JSON.parse(localStorage.getItem("savedJobs")) || [];
  document.getElementById("savedJobsCount").textContent = saved.length;
}

function truncateText(text, maxLen) {
  const str = String(text || "");
  if (str.length <= maxLen) {
    return str;
  }
  return `${str.slice(0, maxLen)}…`;
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
  const jt = normalizeTypeLabel(job.job_type || "");
  const sel = normalizeTypeLabel(selectedType);
  if (jt === sel) {
    return true;
  }
  const jx = jt.replace(/-/g, "");
  const sx = sel.replace(/-/g, "");
  return jx === sx;
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

async function buildMatchProfileBody() {
  const local = getUserProfile();
  const code = getProgressCode();
  if (!code) {
    return {
      skills: local.skills || [],
      courses: local.courses || [],
      projects: local.projects || [],
      resume_text: (local.resume_text || "").trim(),
    };
  }
  try {
    const r = await fetch(`${API_BASE}/profile/data`, {
      headers: { "X-Progress-Code": code },
    });
    if (!r.ok) {
      throw new Error("profile fetch failed");
    }
    const d = await r.json();
    const skills = parseCsvSkills(d.skills);
    const projects = [];
    try {
      const ex = JSON.parse(d.experience_entries_json || "[]");
      if (Array.isArray(ex)) {
        ex.forEach((e) => {
          if (e && e.title) projects.push(String(e.title));
          if (e && e.description) projects.push(String(e.description));
        });
      }
    } catch (_) {
      /* ignore */
    }
    let eduBlob = "";
    try {
      const ed = JSON.parse(d.education_json || "[]");
      if (Array.isArray(ed)) {
        ed.forEach((row) => {
          if (row && typeof row === "object") {
            eduBlob += ` ${row.school || row.program || row.course || ""}`;
            eduBlob += ` ${row.description || ""}`;
          }
        });
      }
    } catch (_) {
      /* ignore */
    }
    const resume_text = [d.resume_text || "", eduBlob].filter((x) => String(x).trim()).join(" ").trim();
    return {
      skills: skills.length ? skills : local.skills || [],
      courses: (d.coursework && parseCsvSkills(d.coursework)) || local.courses || [],
      projects: projects.length ? projects : local.projects || [],
      resume_text: resume_text || (local.resume_text || "").trim(),
    };
  } catch {
    return {
      skills: local.skills || [],
      courses: local.courses || [],
      projects: local.projects || [],
      resume_text: (local.resume_text || "").trim(),
    };
  }
}

async function fetchMatchesFromProfile() {
  try {
    const body = await buildMatchProfileBody();
    const response = await fetch(`${API_BASE}/match`, {
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({
        skills: body.skills,
        courses: body.courses,
        projects: body.projects,
        resume_text: body.resume_text,
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

function inferJobCategoryLabels(job) {
  const hay = jobHaystack(job);
  const out = new Set();
  for (const c of JOB_CATEGORIES) {
    const lab = c.label.toLowerCase();
    if (hay.includes(lab)) {
      out.add(c.label);
    }
    for (const k of c.keys) {
      if (hay.includes(k)) {
        out.add(c.label);
        break;
      }
    }
  }
  return [...out];
}

function jobMatchesSelectedCategories(job) {
  if (selectedCategoryLabels.size === 0) {
    return true;
  }
  const inferred = inferJobCategoryLabels(job);
  const hay = jobHaystack(job);
  for (const sel of selectedCategoryLabels) {
    if (inferred.includes(sel)) {
      return true;
    }
    const words = sel
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
    if (words.length && words.every((w) => hay.includes(w))) {
      return true;
    }
  }
  return false;
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

  if (jobTitleTags.length) {
    filtered = filtered.filter((item) => {
      const hay = jobHaystack(item);
      return jobTitleTags.every((chip) => hay.includes(String(chip).toLowerCase()));
    });
  }

  filtered = filtered.filter((item) => jobMatchesSelectedCategories(item));

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
    container.innerHTML = `<p style="color:#555;">Add skills and experience on your Profile to see stronger AI matches.</p>`;
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

  const reqFit = match ? match.required_skills_fit ?? 0 : 0;
  const profFit = match ? match.profile_text_match ?? 0 : 0;
  const keyFit = match ? match.keyword_overlap ?? 0 : 0;
  const matchScore = match
    ? match.match_score
    : Math.round((reqFit + profFit + keyFit) / 3) || 0;
  const matchedSkills = match ? match.matched_skills : [];
  const missingSkills = match ? match.missing_skills : [];
  const explanation = match ? match.explanation : "No match data available.";

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
          <h5>Required skills fit</h5>
          <span>${reqFit}%</span>
        </div>
        <div class="breakdown-box">
          <h5>Profile and text</h5>
          <span>${profFit}%</span>
        </div>
        <div class="breakdown-box">
          <h5>Keyword overlap</h5>
          <span>${keyFit}%</span>
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

function persistJobFilters() {
  try {
    localStorage.setItem("bridge_job_title_tags", JSON.stringify(jobTitleTags));
    localStorage.setItem("bridge_job_categories", JSON.stringify([...selectedCategoryLabels]));
  } catch (_) {
    /* ignore */
  }
}

function loadJobFilterPrefs() {
  try {
    const t = JSON.parse(localStorage.getItem("bridge_job_title_tags") || "[]");
    if (Array.isArray(t)) {
      jobTitleTags.length = 0;
      t.forEach((x) => {
        const v = String(x).trim();
        if (v && !jobTitleTags.includes(v)) {
          jobTitleTags.push(v);
        }
      });
    }
  } catch (_) {
    /* ignore */
  }
  try {
    const c = JSON.parse(localStorage.getItem("bridge_job_categories") || "[]");
    if (Array.isArray(c)) {
      selectedCategoryLabels.clear();
      c.forEach((x) => {
        const v = String(x).trim();
        if (v) {
          selectedCategoryLabels.add(v);
        }
      });
    }
  } catch (_) {
    /* ignore */
  }
}

function buildCategoryCheckboxes() {
  const host = document.getElementById("jobCategoryChecks");
  if (!host) {
    return;
  }
  host.innerHTML = "";
  JOB_CATEGORIES.forEach((c) => {
    const row = document.createElement("label");
    row.className = "job-cat-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = c.label;
    cb.checked = selectedCategoryLabels.has(c.label);
    cb.addEventListener("change", () => {
      if (cb.checked) {
        selectedCategoryLabels.add(c.label);
      } else {
        selectedCategoryLabels.delete(c.label);
      }
      persistJobFilters();
      resetVisibleJobs();
      displayJobs();
    });
    const span = document.createElement("span");
    span.textContent = c.label;
    row.appendChild(cb);
    row.appendChild(span);
    host.appendChild(row);
  });
}

document.getElementById("filterBtn").addEventListener("click", async () => {
  persistJobFilters();

  matchResults = await fetchMatchesFromProfile();
  resetVisibleJobs();
  renderRecommendations();
  displayJobs();
});

document.getElementById("clearBtn").addEventListener("click", async () => {
  jobTitleTags.length = 0;
  selectedCategoryLabels.clear();
  renderTagBubbles("jobTitleBubbles", jobTitleTags);
  document.getElementById("locationInput").value = "";
  document.getElementById("jobTitleInput").value = "";

  selectedType = null;
  document.querySelectorAll("aside.sidebar .type-bubbles .bubble").forEach((b) => b.classList.remove("active-bubble"));

  buildCategoryCheckboxes();
  persistJobFilters();

  saveUserProfile({ skills: [], courses: [], projects: [], resume_text: "" });

  matchResults = await fetchMatchesFromProfile();
  resetVisibleJobs();
  renderRecommendations();
  displayJobs();
});

const jobsSidebar = document.querySelector("aside.sidebar");
if (jobsSidebar) {
  jobsSidebar.addEventListener("click", (e) => {
    const btn = e.target.closest(".type-bubbles .bubble");
    if (!btn || !btn.dataset.type) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const t = btn.dataset.type;
    if (selectedType === t) {
      selectedType = null;
      jobsSidebar.querySelectorAll(".type-bubbles .bubble").forEach((b) => b.classList.remove("active-bubble"));
    } else {
      selectedType = t;
      jobsSidebar.querySelectorAll(".type-bubbles .bubble").forEach((b) => b.classList.remove("active-bubble"));
      btn.classList.add("active-bubble");
    }
    resetVisibleJobs();
    displayJobs();
  });
}

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

function onJobTitleTagsChanged() {
  persistJobFilters();
  resetVisibleJobs();
  displayJobs();
}

async function init() {
  updateSavedCount();
  await fetchSavedJobIdsFromServer();

  loadJobFilterPrefs();
  buildCategoryCheckboxes();
  setupBubbleInput("jobTitleInput", "jobTitleBubbles", jobTitleTags, onJobTitleTagsChanged);
  renderTagBubbles("jobTitleBubbles", jobTitleTags);

  await fetchJobs();

  matchResults = await fetchMatchesFromProfile();

  renderRecommendations();
  displayJobs();
}

init();
