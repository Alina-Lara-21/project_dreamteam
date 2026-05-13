const trackerColumns = {
  saved: document.getElementById("savedColumn"),
  applied: document.getElementById("appliedColumn"),
  interview: document.getElementById("interviewColumn"),
  offer: document.getElementById("offerColumn"),
};

let draggedJob = null;

function normalizeId(id) {
  return String(id);
}

function getProgressCode() {
  return (
    localStorage.getItem("bridge_progress_code") ||
    localStorage.getItem("progressCode") ||
    localStorage.getItem("progress_code") ||
    ""
  );
}

function authHeaders(extra = {}) {
  const code = getProgressCode();
  return code ? { ...extra, "X-Progress-Code": code } : extra;
}

async function syncSavedJobsFromBackend() {
  const code = getProgressCode();
  if (!code) return;

  try {
    const res = await fetch(`${window.location.origin}/saved-jobs`, {
      headers: authHeaders(),
    });

    if (!res.ok) return;

    const data = await res.json();
    const jobs = data.jobs || data.saved_jobs || [];

    if (jobs.length > 0) {
      localStorage.setItem("savedJobs", JSON.stringify(jobs));
    }
  } catch (err) {
    console.warn("Could not sync saved jobs from backend", err);
  }
}

function getSavedJobs() {
  return JSON.parse(localStorage.getItem("savedJobs")) || [];
}

function migrateFromLegacyBoard() {
  const legacyRaw = localStorage.getItem("jobTrackerBoard");
  if (!legacyRaw) {
    return null;
  }
  let legacy;
  try {
    legacy = JSON.parse(legacyRaw);
  } catch {
    return null;
  }
  if (!legacy || typeof legacy !== "object") {
    return null;
  }
  const savedJobs = getSavedJobs();
  const byId = (id) => savedJobs.find((j) => normalizeId(j.id) === normalizeId(id));
  const pickJobs = (arr) => (Array.isArray(arr) ? arr.map(byId).filter(Boolean) : []);
  const applied = pickJobs(legacy.applied);
  const interview = pickJobs(legacy.interview);
  const offer = pickJobs(legacy.offer);
  const used = new Set([...applied, ...interview, ...offer].map((j) => normalizeId(j.id)));
  const savedOnly = savedJobs.filter((j) => !used.has(normalizeId(j.id)));
  localStorage.removeItem("jobTrackerBoard");
  return { saved: savedOnly, applied, interview, offer };
}

let trackerState = JSON.parse(localStorage.getItem("trackerState") || "null");

if (!trackerState) {
  trackerState = migrateFromLegacyBoard() || {
    saved: [...getSavedJobs()],
    applied: [],
    interview: [],
    offer: [],
  };
  saveTrackerState();
} else {
  syncSavedJobsToTracker();
}

function saveTrackerState() {
  localStorage.setItem("trackerState", JSON.stringify(trackerState));
}

function syncSavedJobsToTracker() {
  const savedJobs = getSavedJobs();
  const trackedIds = Object.values(trackerState)
    .flat()
    .map((job) => normalizeId(job.id));
  const missingSaved = savedJobs.filter((job) => !trackedIds.includes(normalizeId(job.id)));
  if (missingSaved.length > 0) {
    trackerState.saved = [...(trackerState.saved || []), ...missingSaved];
    saveTrackerState();
  }
}

function launchConfetti() {
  for (let i = 0; i < 90; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = Math.random() * window.innerWidth + "px";
    confetti.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
    confetti.style.animationDelay = Math.random() * 0.25 + "s";
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    const colors = ["#3a86ff", "#8338ec", "#06d6a0", "#ffb703", "#ff006e", "#fb5607"];
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 5000);
  }
}

function updateCounts() {
  const savedCount = document.getElementById("savedCount");
  const appliedCount = document.getElementById("appliedCount");
  const interviewCount = document.getElementById("interviewCount");
  const offerCount = document.getElementById("offerCount");
  if (savedCount) savedCount.textContent = trackerState.saved.length;
  if (appliedCount) appliedCount.textContent = trackerState.applied.length;
  if (interviewCount) interviewCount.textContent = trackerState.interview.length;
  if (offerCount) offerCount.textContent = trackerState.offer.length;
}

function jobTypeLabel(job) {
  return job.job_type || job.type || "Job type";
}

function openTrackerModal(job) {
  const modal = document.getElementById("trackerModal");
  const details = document.getElementById("trackerJobDetails");
  if (!modal || !details) return;
  const jt = jobTypeLabel(job);
  details.innerHTML = `
    <h2>${job.title}</h2>
    <p><strong>${job.company}</strong></p>
    <div class="job-meta modal-tags">
      <span class="tag">${job.location || "No location"}</span>
      <span class="tag">${jt}</span>
      <span class="tag">${job.salary_range || "Salary not listed"}</span>
    </div>
    <h3>Description</h3>
    <p>${job.description || "No description available."}</p>
    <h3>Required skills</h3>
    <ul>
      ${(job.skills_required || []).map((skill) => `<li>${skill}</li>`).join("") || "<li>No skills listed.</li>"}
    </ul>
    ${job.apply_link ? `<a class="apply-btn" href="${job.apply_link}" target="_blank">Apply now</a>` : ""}
  `;
  modal.classList.remove("hidden");
}

function removeJob(id, status) {
  const cards = document.querySelectorAll(".mini-job");
  cards.forEach((card) => {
    if (normalizeId(card.dataset.id) !== normalizeId(id)) return;
    card.animate(
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(0.6)", opacity: 0 },
      ],
      { duration: 250, easing: "ease", fill: "forwards" },
    );
    setTimeout(() => {
      trackerState[status] = trackerState[status].filter((job) => normalizeId(job.id) !== normalizeId(id));
      if (status === "saved") {
        const savedJobs = getSavedJobs();
        localStorage.setItem(
          "savedJobs",
          JSON.stringify(savedJobs.filter((job) => normalizeId(job.id) !== normalizeId(id))),
        );
      }
      saveTrackerState();
      renderTracker();
    }, 250);
  });
}

function renderTracker() {
  Object.values(trackerColumns).forEach((column) => {
    if (column) column.innerHTML = "";
  });
  Object.keys(trackerState).forEach((status) => {
    const column = trackerColumns[status];
    if (!column) return;
    if (trackerState[status].length === 0) {
      column.innerHTML = `<div class="empty-column">Drop jobs here</div>`;
      return;
    }
    trackerState[status].forEach((job) => {
      const card = document.createElement("div");
      card.className = "mini-job";
      card.draggable = true;
      card.dataset.id = job.id;
      const jt = jobTypeLabel(job);
      card.innerHTML = `
        <strong>${job.title}</strong>
        <p>${job.company}</p>
        <div class="mini-tags">
          <span>${job.location || "No location"}</span>
          <span>${jt}</span>
        </div>
        <div class="tracker-actions">
          <button type="button" class="view-btn">View</button>
          <button type="button" class="remove-btn">Remove</button>
        </div>
      `;
      card.addEventListener("dragstart", () => {
        draggedJob = { job, from: status };
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.querySelector(".view-btn").addEventListener("click", () => openTrackerModal(job));
      card.querySelector(".remove-btn").addEventListener("click", () => removeJob(job.id, status));
      column.appendChild(card);
    });
  });
  updateCounts();
}

Object.keys(trackerColumns).forEach((status) => {
  const column = trackerColumns[status];
  if (!column) return;
  column.addEventListener("dragover", (e) => {
    e.preventDefault();
    column.classList.add("drag-over");
  });
  column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
  column.addEventListener("drop", (e) => {
    e.preventDefault();
    column.classList.remove("drag-over");
    if (!draggedJob) return;
    const { job, from } = draggedJob;
    trackerState[from] = trackerState[from].filter((item) => normalizeId(item.id) !== normalizeId(job.id));
    const exists = trackerState[status].some((item) => normalizeId(item.id) === normalizeId(job.id));
    if (!exists) {
      trackerState[status].push(job);
    }
    saveTrackerState();
    if (status === "offer") {
      launchConfetti();
    }
    renderTracker();
    draggedJob = null;
  });
});

const closeTrackerModal = document.getElementById("closeTrackerModal");
if (closeTrackerModal) {
  closeTrackerModal.addEventListener("click", () => {
    document.getElementById("trackerModal").classList.add("hidden");
  });
}

window.addEventListener("click", (e) => {
  const modal = document.getElementById("trackerModal");
  if (modal && e.target === modal) {
    modal.classList.add("hidden");
  }
});

async function initTracker() {
  await syncSavedJobsFromBackend();
  syncSavedJobsToTracker();
  renderTracker();
}

initTracker();
