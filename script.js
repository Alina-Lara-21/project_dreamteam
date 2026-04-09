const API_BASE_URL = window.JOB_API_BASE_URL || "http://127.0.0.1:8000";

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
  const params = buildFilterParams(filters);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  const endpoints = ["/jobs/filter", "/jobs"];

  for (const endpoint of endpoints) {
    const response = await fetch(`${API_BASE_URL}${endpoint}${suffix}`);

    if (response.status === 404) {
      continue;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: HTTP ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
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
    container.innerHTML = `<p>Unable to load jobs from FastAPI: ${err.message}</p>`;
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
    container.innerHTML = `<p>Unable to fetch filtered jobs: ${err.message}</p>`;
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
    container.innerHTML = `<p>Unable to load saved jobs: ${err.message}</p>`;
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
    container.innerHTML = `<p>Unable to load job details: ${err.message}</p>`;
  }
}

loadSavedJobs();
loadJobDetails();