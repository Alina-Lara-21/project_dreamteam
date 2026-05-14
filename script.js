/* =========================
   BRIDGE - MERGED SCRIPT.JS
   FINAL COMBINED VERSION
========================= */

const API_BASE = window.__API_BASE__ || window.location.origin;

/* =========================
   CATEGORY FILTERS
========================= */

const JOB_CATEGORIES = [
  {
    id: "ai",
    label: "AI & Machine Learning",
    keys: [
      "machine learning",
      "deep learning",
      "llm",
      "nlp",
      "tensorflow",
      "pytorch",
      "computer vision",
      " ai ",
      "ml ",
    ],
  },
  {
    id: "data",
    label: "Data & Analytics",
    keys: [
      "data analyst",
      "data engineer",
      "analytics",
      "business intelligence",
      "sql",
      "etl",
      "tableau",
      "power bi",
    ],
  },
  {
    id: "sw",
    label: "Software Development",
    keys: [
      "software engineer",
      "developer",
      "frontend",
      "backend",
      "full stack",
      "react",
      "node",
      "python",
      "java",
    ],
  },
  {
    id: "it",
    label: "IT & Cybersecurity",
    keys: [
      "network",
      "sysadmin",
      "cybersecurity",
      "security engineer",
      "infrastructure",
    ],
  },
  {
    id: "ux",
    label: "Design & UX",
    keys: ["ux", "ui", "figma", "designer", "product design"],
  },
];

/* =========================
   GLOBAL STATE
========================= */

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

const selectedCategoryLabels = new Set();
const savedJobIdsServer = new Set();

/* =========================
   HELPERS
========================= */

function normalizeId(id) {
  return String(id);
}

function truncateText(text, maxLen) {
  const s = String(text || "");
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}…`;
}

function getProgressCode() {
  return (
    localStorage.getItem("bridge_progress_code") ||
    localStorage.getItem("progressCode") ||
    localStorage.getItem("progress_code") ||
    ""
  );
}

function apiJsonHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  const code = getProgressCode();

  if (code) {
    headers["X-Progress-Code"] = code;
  }

  return headers;
}

function normalizeTypeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function getJobType(job) {
  return job.job_type || job.type || "Job Type";
}

function resetVisibleJobs() {
  visibleJobsCount = JOBS_PAGE_INCREMENT;
}

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2200);
}

/* =========================
   PROFILE
========================= */

function getUserProfile() {
  return (
    JSON.parse(localStorage.getItem("userProfile")) || {
      skills: [],
      courses: [],
      projects: [],
      resume_text: "",
      selectedType: null,
      location: "",
    }
  );
}

function saveUserProfile(profile) {
  localStorage.setItem("userProfile", JSON.stringify(profile));
}

function saveCurrentFiltersToProfile() {
  const profile = getUserProfile();

  profile.skills = skillTags;
  profile.courses = courseTags;
  profile.projects = expTags;
  profile.selectedType = selectedType;

  const locationInput = document.getElementById("locationInput");

  if (locationInput) {
    profile.location = locationInput.value.trim();
  }

  saveUserProfile(profile);
}

function loadProfileFilters() {
  const profile = getUserProfile();

  skillTags = profile.skills || [];
  courseTags = profile.courses || [];
  expTags = profile.projects || [];
  selectedType = profile.selectedType || null;

  const locationInput = document.getElementById("locationInput");

  if (locationInput) {
    locationInput.value = profile.location || "";
  }

  renderTagBubbles("skillsBubbles", skillTags, onFilterTagsChanged);
  renderTagBubbles("courseworkBubbles", courseTags, onFilterTagsChanged);
  renderTagBubbles("experienceBubbles", expTags, onFilterTagsChanged);

  document.querySelectorAll(".bubble").forEach((bubble) => {
    bubble.classList.remove("active-bubble");

    if (bubble.dataset.type === selectedType) {
      bubble.classList.add("active-bubble");
    }
  });
}

/* =========================
   SAVED JOBS
========================= */

function getSavedJobs() {
  return JSON.parse(localStorage.getItem("savedJobs")) || [];
}

function updateSavedCount() {
  const el = document.getElementById("savedJobsCount");

  if (el) {
    el.textContent = getSavedJobs().length;
  }
}

function isJobSaved(jobId) {
  return (
    savedJobIdsServer.has(jobId) ||
    getSavedJobs().some(
      (job) => normalizeId(job.id) === normalizeId(jobId)
    )
  );
}

async function fetchSavedJobIdsFromServer() {
  savedJobIdsServer.clear();

  const code = getProgressCode();

  if (!code) return;

  try {
    const response = await fetch(`${API_BASE}/saved-jobs`, {
      headers: {
        "X-Progress-Code": code,
      },
    });

    if (!response.ok) return;

    const data = await response.json();

    (data.job_ids || []).forEach((id) => {
      savedJobIdsServer.add(id);
    });
  } catch (error) {
    console.error(error);
  }
}

function syncTrackerSavedState(job, savedNow) {
  const raw = localStorage.getItem("trackerState");

  if (!raw) return;

  let trackerState;

  try {
    trackerState = JSON.parse(raw);
  } catch {
    return;
  }

  trackerState.saved = trackerState.saved || [];

  if (savedNow) {
    const exists = trackerState.saved.some(
      (item) => normalizeId(item.id) === normalizeId(job.id)
    );

    if (!exists) {
      trackerState.saved.push(job);
    }
  } else {
    trackerState.saved = trackerState.saved.filter(
      (item) => normalizeId(item.id) !== normalizeId(job.id)
    );
  }

  localStorage.setItem(
    "trackerState",
    JSON.stringify(trackerState)
  );
}

async function saveJob(job) {
  let saved = getSavedJobs();

  if (isJobSaved(job.id)) {
    saved = saved.filter(
      (item) => normalizeId(item.id) !== normalizeId(job.id)
    );

    localStorage.setItem("savedJobs", JSON.stringify(saved));

    savedJobIdsServer.delete(job.id);

    const code = getProgressCode();

    if (code) {
      try {
        await fetch(`${API_BASE}/saved-jobs/${job.id}`, {
          method: "DELETE",
          headers: apiJsonHeaders(),
        });
      } catch (error) {
        console.warn(error);
      }
    }

    syncTrackerSavedState(job, false);

    updateSavedCount();

    showToast("Job removed from saved.");

    return false;
  }

  saved.push(job);

  localStorage.setItem("savedJobs", JSON.stringify(saved));

  savedJobIdsServer.add(job.id);

  const code = getProgressCode();

  if (code) {
    try {
      await fetch(`${API_BASE}/saved-jobs`, {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({
          job_id: job.id,
        }),
      });
    } catch (error) {
      console.warn(error);
    }
  }

  syncTrackerSavedState(job, true);

  updateSavedCount();

  showToast("Job saved.");

  return true;
}

/* =========================
   COMPARE JOBS
========================= */

function getCompareJobs() {
  return JSON.parse(localStorage.getItem("compareJobs")) || [];
}

function isJobCompared(jobId) {
  return getCompareJobs().some(
    (job) => normalizeId(job.id) === normalizeId(jobId)
  );
}

function compareJob(job) {
  let compare = getCompareJobs();

  if (isJobCompared(job.id)) {
    compare = compare.filter(
      (item) => normalizeId(item.id) !== normalizeId(job.id)
    );

    localStorage.setItem(
      "compareJobs",
      JSON.stringify(compare)
    );

    showToast("Job removed from Compare.");

    return false;
  }

  compare.push(job);

  localStorage.setItem(
    "compareJobs",
    JSON.stringify(compare)
  );

  showToast("Added to Compare.");

  return true;
}

/* =========================
   TAG BUBBLES
========================= */

function renderTagBubbles(containerId, listRef, onChange) {
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = "";

  listRef.forEach((tag, index) => {
    const bubble = document.createElement("div");

    bubble.className = "input-bubble";

    bubble.innerHTML = `
      ${tag}
      <span>&times;</span>
    `;

    bubble.querySelector("span").addEventListener("click", () => {
      listRef.splice(index, 1);

      renderTagBubbles(containerId, listRef, onChange);

      if (onChange) {
        onChange();
      }
    });

    container.appendChild(bubble);
  });
}

function setupBubbleInput(
  inputId,
  containerId,
  listRef,
  onChange
) {
  const input = document.getElementById(inputId);

  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;

    e.preventDefault();

    const value = input.value.trim();

    if (!value) return;

    if (!listRef.includes(value)) {
      listRef.push(value);
    }

    input.value = "";

    renderTagBubbles(containerId, listRef, onChange);

    if (onChange) {
      onChange();
    }
  });
}

/* =========================
   API
========================= */

async function fetchJobs() {
  try {
    const response = await fetch(
      `${API_BASE}/jobs?limit=5000`
    );

    const data = await response.json();

    jobs = data.jobs || [];

    const total = document.getElementById("totalJobsCount");

    if (total) {
      total.textContent = jobs.length;
    }
  } catch (error) {
    console.error(error);

    showToast("Could not load jobs.");
  }
}

async function fetchMatches(
  skills,
  courses,
  projects,
  resumeText
) {
  try {
    const response = await fetch(`${API_BASE}/match`, {
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({
        skills,
        courses,
        projects,
        resume_text: resumeText || "",
      }),
    });

    const data = await response.json();

    return data.matches || [];
  } catch (error) {
    console.error(error);

    return [];
  }
}

/* =========================
   FILTERING
========================= */

function jobHaystack(job) {
  return [
    job.title,
    job.company,
    job.location,
    job.description,
    getJobType(job),
    ...(job.skills_required || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferJobCategoryLabels(job) {
  const hay = jobHaystack(job);

  const out = new Set();

  for (const c of JOB_CATEGORIES) {
    const label = c.label.toLowerCase();

    if (hay.includes(label)) {
      out.add(c.label);
    }

    for (const key of c.keys) {
      if (hay.includes(key)) {
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

  for (const selected of selectedCategoryLabels) {
    if (inferred.includes(selected)) {
      return true;
    }
  }

  return false;
}

function buildCategoryCheckboxes() {
  const host = document.getElementById(
    "jobCategoryChecks"
  );

  if (!host) return;

  host.innerHTML = "";

  JOB_CATEGORIES.forEach((category) => {
    const row = document.createElement("label");

    row.className = "job-cat-row";

    const cb = document.createElement("input");

    cb.type = "checkbox";
    cb.value = category.label;

    cb.checked = selectedCategoryLabels.has(
      category.label
    );

    cb.addEventListener("change", () => {
      if (cb.checked) {
        selectedCategoryLabels.add(category.label);
      } else {
        selectedCategoryLabels.delete(category.label);
      }

      persistJobFilters();

      resetVisibleJobs();

      displayJobs();
    });

    const span = document.createElement("span");

    span.textContent = category.label;

    row.appendChild(cb);
    row.appendChild(span);

    host.appendChild(row);
  });
}

function persistJobFilters() {
  localStorage.setItem(
    "bridge_job_categories",
    JSON.stringify([...selectedCategoryLabels])
  );
}

function loadJobFilterPrefs() {
  try {
    const categories = JSON.parse(
      localStorage.getItem(
        "bridge_job_categories"
      ) || "[]"
    );

    selectedCategoryLabels.clear();

    categories.forEach((cat) => {
      selectedCategoryLabels.add(cat);
    });
  } catch {}
}

function jobMatchesSelectedType(job) {
  if (!selectedType) return true;

  return (
    normalizeTypeLabel(getJobType(job)) ===
    normalizeTypeLabel(selectedType)
  );
}

function applyFilters(list) {
  let filtered = [...list];

  if (jobSearchChips.length > 0) {
    filtered = filtered.filter((job) => {
      const hay = jobHaystack(job);

      return jobSearchChips.every((chip) =>
        hay.includes(String(chip).toLowerCase())
      );
    });
  }

  filtered = filtered.filter((job) =>
    jobMatchesSelectedCategories(job)
  );

  if (selectedType) {
    filtered = filtered.filter((job) =>
      jobMatchesSelectedType(job)
    );
  }

  const locationInput =
    document.getElementById("locationInput");

  const locationValue = locationInput
    ? locationInput.value.trim().toLowerCase()
    : "";

  if (locationValue) {
    filtered = filtered.filter((job) =>
      String(job.location || "")
        .toLowerCase()
        .includes(locationValue)
    );
  }

  if (currentSort === "best") {
    filtered.sort(
      (a, b) =>
        (b.match_score || 0) -
        (a.match_score || 0)
    );
  }

  if (currentSort === "newest") {
    filtered.sort(
      (a, b) =>
        new Date(b.postedDate || 0) -
        new Date(a.postedDate || 0)
    );
  }

  if (currentSort === "az") {
    filtered.sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }

  if (currentSort === "za") {
    filtered.sort((a, b) =>
      b.title.localeCompare(a.title)
    );
  }

  return filtered;
}

function getCombinedJobs() {
  const matchMap = new Map(
    matchResults.map((m) => [
      normalizeId(m.job_id),
      m,
    ])
  );

  return jobs.map((job) => {
    const match = matchMap.get(
      normalizeId(job.id)
    );

    return {
      ...job,
      match_score: match
        ? match.match_score
        : 0,
      matched_skills: match
        ? match.matched_skills
        : [],
      missing_skills: match
        ? match.missing_skills
        : [],
      explanation: match
        ? match.explanation
        : "Add profile details to improve matches.",
    };
  });
}

/* =========================
   RECOMMENDATIONS
========================= */

function renderRecommendations() {
  const container =
    document.getElementById(
      "recommendedJobs"
    );

  if (!container) return;

  container.innerHTML = "";

  const topJobs = getCombinedJobs()
    .sort(
      (a, b) =>
        (b.match_score || 0) -
        (a.match_score || 0)
    )
    .slice(0, 3);

  if (topJobs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No recommendations yet</h3>
        <p>Add skills and profile details.</p>
      </div>
    `;
    return;
  }

  topJobs.forEach((job) => {
    const card = document.createElement("div");

    card.className = "recommended-card";

    card.innerHTML = `
      <div class="mini-label">Recommended</div>
      <h3>${job.title}</h3>
      <p>${job.company}</p>
      <span class="match-pill">
        ${job.match_score}% Match
      </span>
    `;

    card.addEventListener("click", () =>
      openJobModal(job.id)
    );

    container.appendChild(card);
  });
}

/* =========================
   DISPLAY JOBS
========================= */

function displayJobs() {
  const container =
    document.getElementById("jobList");

  if (!container) return;

  container.innerHTML = "";

  let combined = getCombinedJobs();

  combined = applyFilters(combined);

  const visible = combined.slice(
    0,
    visibleJobsCount
  );

  visible.forEach((job) => {
    const card = document.createElement("div");

    card.className = "job-card";

    const saved = isJobSaved(job.id);
    const compared = isJobCompared(job.id);

    card.innerHTML = `
      <div class="job-card-top">
        <div>
          <div class="job-title">
            ${job.title}
          </div>

          <div class="job-company">
            ${job.company}
            •
            ${job.location || "Location not listed"}
          </div>
        </div>

        <div class="match-score-box">
          <span>${job.match_score}%</span>
          <small>Match</small>
        </div>
      </div>

      <div class="job-meta">
        <span class="tag">
          ${job.salary_range || "Salary not listed"}
        </span>

        <span class="tag">
          ${getJobType(job)}
        </span>
      </div>

      <div class="match-bar">
        <div style="width:${job.match_score}%"></div>
      </div>

      <p class="job-summary">
        ${truncateText(job.description, 150)}
      </p>

      <div class="job-actions">
        <button class="save-btn ${saved ? "saved" : ""}">
          ${saved ? "Saved" : "Save"}
        </button>

        <button class="compare-btn ${compared ? "compared" : ""}">
          ${compared ? "Compared" : "Compare"}
        </button>
      </div>
    `;

    card.addEventListener("click", () =>
      openJobModal(job.id)
    );

    const saveBtn =
      card.querySelector(".save-btn");

    saveBtn.addEventListener(
      "click",
      async (e) => {
        e.stopPropagation();

        const savedNow = await saveJob(job);

        saveBtn.classList.toggle(
          "saved",
          savedNow
        );

        saveBtn.textContent = savedNow
          ? "Saved"
          : "Save";

        displayJobs();
      }
    );

    const compareBtn =
      card.querySelector(".compare-btn");

    compareBtn.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();

        const comparedNow =
          compareJob(job);

        compareBtn.classList.toggle(
          "compared",
          comparedNow
        );

        compareBtn.textContent =
          comparedNow
            ? "Compared"
            : "Compare";

        displayJobs();
      }
    );

    container.appendChild(card);
  });
}

/* =========================
   MODAL
========================= */

function openJobModal(jobId) {
  const modal =
    document.getElementById("jobModal");

  const details =
    document.getElementById("jobDetails");

  if (!modal || !details) return;

  const job = getCombinedJobs().find(
    (j) =>
      normalizeId(j.id) ===
      normalizeId(jobId)
  );

  if (!job) return;

  const saved = isJobSaved(job.id);
  const compared = isJobCompared(job.id);

  details.innerHTML = `
    <h2>${job.title}</h2>

    <p>
      <strong>${job.company}</strong>
      •
      ${job.location || "Location not listed"}
    </p>

    <div class="job-meta modal-tags">
      <span class="tag">
        ${job.salary_range || "Salary not listed"}
      </span>

      <span class="tag">
        ${getJobType(job)}
      </span>

      <span class="tag blue-tag">
        ${job.match_score}% Match
      </span>
    </div>

    <h3>Description</h3>

    <p>
      ${job.description || "No description available."}
    </p>

    <div class="modal-actions">
      <button
        id="modalSaveBtn"
        class="save-btn ${saved ? "saved" : ""}"
      >
        ${saved ? "Saved" : "Save Job"}
      </button>

      <button
        id="modalCompareBtn"
        class="compare-btn ${compared ? "compared" : ""}"
      >
        ${compared ? "Compared" : "Add to Compare"}
      </button>

      <a
        class="apply-btn"
        href="${job.apply_link || "#"}"
        target="_blank"
      >
        Apply Now
      </a>
    </div>
  `;

  document
    .getElementById("modalSaveBtn")
    .addEventListener(
      "click",
      async () => {
        await saveJob(job);

        openJobModal(job.id);

        displayJobs();
      }
    );

  document
    .getElementById("modalCompareBtn")
    .addEventListener("click", () => {
      compareJob(job);

      openJobModal(job.id);

      displayJobs();
    });

  modal.classList.remove("hidden");
}

/* =========================
   EVENTS
========================= */

function setupEvents() {
  document
    .querySelectorAll(".bubble")
    .forEach((bubble) => {
      bubble.addEventListener(
        "click",
        () => {
          const type =
            bubble.dataset.type;

          document
            .querySelectorAll(".bubble")
            .forEach((b) =>
              b.classList.remove(
                "active-bubble"
              )
            );

          if (selectedType === type) {
            selectedType = null;
          } else {
            selectedType = type;

            bubble.classList.add(
              "active-bubble"
            );
          }

          resetVisibleJobs();

          displayJobs();
        }
      );
    });

  const filterBtn =
    document.getElementById(
      "filterBtn"
    );

  if (filterBtn) {
    filterBtn.addEventListener(
      "click",
      async () => {
        saveCurrentFiltersToProfile();

        const profile =
          getUserProfile();

        matchResults =
          await fetchMatches(
            skillTags,
            courseTags,
            expTags,
            profile.resume_text || ""
          );

        resetVisibleJobs();

        renderRecommendations();

        displayJobs();

        showToast(
          "Filters applied."
        );
      }
    );
  }

  const sortSelect =
    document.getElementById(
      "sortSelect"
    );

  if (sortSelect) {
    sortSelect.addEventListener(
      "change",
      (e) => {
        currentSort =
          e.target.value;

        resetVisibleJobs();

        displayJobs();
      }
    );
  }

  const closeModal =
    document.getElementById(
      "closeModal"
    );

  if (closeModal) {
    closeModal.addEventListener(
      "click",
      () => {
        document
          .getElementById(
            "jobModal"
          )
          .classList.add(
            "hidden"
          );
      }
    );
  }
}

/* =========================
   FILTER CALLBACKS
========================= */

function onFilterTagsChanged() {
  resetVisibleJobs();

  displayJobs();
}

/* =========================
   INIT
========================= */

async function init() {
  updateSavedCount();

  setupEvents();

  setupBubbleInput(
    "skillsInput",
    "skillsBubbles",
    skillTags,
    onFilterTagsChanged
  );

  setupBubbleInput(
    "courseworkInput",
    "courseworkBubbles",
    courseTags,
    onFilterTagsChanged
  );

  setupBubbleInput(
    "experienceInput",
    "experienceBubbles",
    expTags,
    onFilterTagsChanged
  );

  loadProfileFilters();

  loadJobFilterPrefs();

  buildCategoryCheckboxes();

  await fetchSavedJobIdsFromServer();

  await fetchJobs();

  const profile = getUserProfile();

  matchResults =
    await fetchMatches(
      profile.skills || [],
      profile.courses || [],
      profile.projects || [],
      profile.resume_text || ""
    );

  renderRecommendations();

  displayJobs();
}

init();