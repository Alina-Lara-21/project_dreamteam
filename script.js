const API_BASE_URL_STORAGE_KEY = "JOB_API_BASE_URL";
const API_BASE_URL = resolveApiBaseUrl();

let backendHealth = {
  checked: false,
  ok: false,
};

function resolveApiBaseUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get("apiBase");
  if (typeof fromQuery === "string" && fromQuery.trim()) {
    return fromQuery.trim().replace(/\/+$/, "");
  }

  const fromWindow = window.JOB_API_BASE_URL;
  if (typeof fromWindow === "string" && fromWindow.trim()) {
    return fromWindow.trim().replace(/\/+$/, "");
  }

  const fromStorage = localStorage.getItem(API_BASE_URL_STORAGE_KEY);
  if (typeof fromStorage === "string" && fromStorage.trim()) {
    return fromStorage.trim().replace(/\/+$/, "");
  }

  return window.location.origin.replace(/\/+$/, "");
}

async function readErrorBody(response) {
  try {
    return await response.text();
  } catch (_) {
    return "";
  }
}

function normalizeJobsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.jobs)) return payload.jobs;
  return [];
}

async function ensureBackendHealthy() {
  if (backendHealth.checked && backendHealth.ok) {
    return;
  }

  const url = `${API_BASE_URL}/health`;
  console.log("[API] health-check request", { endpoint: url, queryParams: {} });

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error("[API] health-check network error", {
      endpoint: url,
      error: error.message,
    });
    throw new Error(
      "Backend is unavailable. Start FastAPI or update JOB_API_BASE_URL."
    );
  }

  console.log("[API] health-check response", {
    endpoint: url,
    status: response.status,
  });

  if (!response.ok) {
    const body = await readErrorBody(response);
    console.error("[API] health-check failed", {
      endpoint: url,
      status: response.status,
      body,
    });
    throw new Error(
      "Backend health check failed. Confirm the API server is running."
    );
  }

  backendHealth.checked = true;
  backendHealth.ok = true;
}

function buildFilterParams(filters = {}) {
  const params = new URLSearchParams();

  if (filters.skills) {
    params.set("skills", filters.skills);
  }

  if (filters.coursework) {
    params.set("coursework", filters.coursework);
  }

  if (filters.experience) {
    params.set("experience", filters.experience);
  }

  return params;
}

async function getJobs(filters = {}) {
  await ensureBackendHealthy();

  const params = buildFilterParams(filters);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  const endpoints = ["/jobs/filter", "/jobs"];

  for (const endpoint of endpoints) {
    const url = `${API_BASE_URL}${endpoint}${suffix}`;
    console.log("[API] jobs request", {
      endpoint: `${API_BASE_URL}${endpoint}`,
      queryParams: Object.fromEntries(params.entries()),
    });
    const response = await fetch(url);
    console.log("[API] jobs response", {
      endpoint: `${API_BASE_URL}${endpoint}`,
      status: response.status,
    });

    if (response.status === 404) {
      continue;
    }

    if (!response.ok) {
      const body = await readErrorBody(response);
      console.error("[API] jobs request failed", {
        endpoint: `${API_BASE_URL}${endpoint}`,
        queryParams: Object.fromEntries(params.entries()),
        status: response.status,
        body,
      });
      throw new Error(`Failed to fetch jobs: HTTP ${response.status}`);
    }

    const payload = await response.json();
    return normalizeJobsPayload(payload);
  }

  throw new Error("No compatible FastAPI jobs endpoint found.");
}

function createJobCard(job) {
  const card = document.createElement("div");
  card.className = "job-card";

  const id = job.id ?? job.job_id;

  card.innerHTML = `
<h3>${job.title || "Untitled role"}</h3>
<p>${job.company || job.company_name || "Unknown company"}</p>
<p>${job.location || "Location not listed"}</p>
<button class="save-btn">Save Job</button>
`;

  card.onclick = () => {
    if (id !== undefined && id !== null) {
      window.location = `job.html?id=${id}`;
    }
  };

  card.querySelector("button").onclick = (e) => {
    e.stopPropagation();
    if (id !== undefined && id !== null) {
      saveJob(id);
    }
  };

  return card;
}

function renderJobs(container, jobs, emptyMessage) {
  if (!container) return;

  container.innerHTML = "";

  if (!jobs.length) {
    container.innerHTML = `<p>${emptyMessage}</p>`;
    return;
  }

  jobs.forEach((job) => {
    container.appendChild(createJobCard(job));
  });
}

async function loadAllJobs() {
  const container = document.getElementById("jobResults");
  if (!container) return;

  try {
    const jobs = await getJobs();
    renderJobs(container, jobs, "No job postings available right now.");
  } catch (err) {
    console.error("[UI] loadAllJobs failed", { error: err.message });
    container.innerHTML = `<p>We couldn't reach the backend right now. Please check that FastAPI is running and try again.</p><p><small>${err.message}</small></p>`;
  }
}

async function findJobs() {
  const skills = document.getElementById("skills")?.value?.trim() || "";
  const coursework = document.getElementById("coursework")?.value?.trim() || "";
  const experience = document.getElementById("experience")?.value?.trim() || "";
  const container = document.getElementById("jobResults");

  if (!container) return;

  try {
    const jobs = await getJobs({ skills, coursework, experience });
    renderJobs(container, jobs, "No matches found for your current filters.");
  } catch (err) {
    console.error("[UI] findJobs failed", { error: err.message });
    container.innerHTML = `<p>We couldn't load filtered jobs because the backend is unavailable.</p><p><small>${err.message}</small></p>`;
  }
}

function saveJob(id) {
  let saved = JSON.parse(localStorage.getItem("savedJobs")) || [];
  const normalizedId = String(id);

  if (!saved.includes(normalizedId)) {
    saved.push(normalizedId);
  }

  localStorage.setItem("savedJobs", JSON.stringify(saved));
  alert("Job saved!");
}

async function loadSavedJobs() {
  const container = document.getElementById("savedJobs");
  if (!container) return;

  const saved = JSON.parse(localStorage.getItem("savedJobs")) || [];

  try {
    const jobs = await getJobs();
    const selected = saved
      .map((id) => jobs.find((job) => String(job.id ?? job.job_id) === String(id)))
      .filter(Boolean);

    renderJobs(container, selected, "You have no saved jobs yet.");
  } catch (err) {
    console.error("[UI] loadSavedJobs failed", { error: err.message });
    container.innerHTML = `<p>We couldn't load saved jobs because the backend is unavailable.</p><p><small>${err.message}</small></p>`;
  }
}

async function loadJobDetails() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const container = document.getElementById("jobDetails");

  if (!id || !container) return;

  try {
    const jobs = await getJobs();
    const job = jobs.find((j) => String(j.id ?? j.job_id) === String(id));

    if (!job) {
      container.innerHTML = "<p>Job not found.</p>";
      return;
    }

    const jobId = job.id ?? job.job_id;

    container.innerHTML = `
<h2>${job.title || "Untitled role"}</h2>
<h3>${job.company || job.company_name || "Unknown company"}</h3>
<p><b>Location:</b> ${job.location || "Location not listed"}</p>

<h4>Description</h4>
<p>${job.description || "No description provided."}</p>

<h4>Requirements</h4>
<p>${job.requirements || job.skills_desc || "No requirements listed."}</p>

<button onclick="saveJob('${jobId}')" class="btn btn-primary">
Save Job
</button>
`;
  } catch (err) {
    console.error("[UI] loadJobDetails failed", { error: err.message });
    container.innerHTML = `<p>We couldn't load this job because the backend is unavailable.</p><p><small>${err.message}</small></p>`;
  }
}

loadSavedJobs();
loadJobDetails();