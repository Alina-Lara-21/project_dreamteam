/* =========================
   TRACKER.JS
========================= */

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

function getSavedJobs() {
  return JSON.parse(localStorage.getItem("savedJobs")) || [];
}

function saveTrackerState() {
  localStorage.setItem("trackerState", JSON.stringify(trackerState));
}

function syncSavedLocalStorage(jobs) {
  localStorage.setItem("savedJobs", JSON.stringify(jobs || []));
}

function jobTypeLabel(job) {
  return job.job_type || job.type || "Job type";
}

/* =========================
   LEGACY MIGRATION
========================= */

function migrateFromLegacyBoard() {
  const legacyRaw = localStorage.getItem("jobTrackerBoard");
  if (!legacyRaw) return null;

  let legacy;

  try {
    legacy = JSON.parse(legacyRaw);
  } catch {
    return null;
  }

  if (!legacy || typeof legacy !== "object") return null;

  const savedJobs = getSavedJobs();

  const byId = (id) =>
    savedJobs.find((job) => normalizeId(job.id) === normalizeId(id));

  const pickJobs = (arr) =>
    Array.isArray(arr) ? arr.map(byId).filter(Boolean) : [];

  const applied = pickJobs(legacy.applied);
  const interview = pickJobs(legacy.interview);
  const offer = pickJobs(legacy.offer);

  const used = new Set(
    [...applied, ...interview, ...offer].map((job) => normalizeId(job.id))
  );

  const savedOnly = savedJobs.filter(
    (job) => !used.has(normalizeId(job.id))
  );

  localStorage.removeItem("jobTrackerBoard");

  return {
    saved: savedOnly,
    applied,
    interview,
    offer,
  };
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
}

/* =========================
   BACKEND SYNC
========================= */

async function fetchJobsCatalog() {
  const code = getProgressCode();
  const headers = code ? { "X-Progress-Code": code } : {};

  try {
    const res = await fetch(`${window.location.origin}/jobs?limit=5000`, {
      headers,
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.jobs || [];
  } catch {
    return [];
  }
}

async function hydrateSavedFromBackend() {
  const code = getProgressCode();

  if (!code) {
    syncSavedJobsToTracker();
    return;
  }

  let ids = [];

  try {
    const res = await fetch(`${window.location.origin}/saved-jobs`, {
      headers: authHeaders(),
    });

    if (res.ok) {
      const data = await res.json();

      if (Array.isArray(data.job_ids)) {
        ids = data.job_ids;
      } else if (Array.isArray(data.jobs)) {
        trackerState.saved = data.jobs;
        syncSavedLocalStorage(data.jobs);
        saveTrackerState();
        return;
      } else if (Array.isArray(data.saved_jobs)) {
        trackerState.saved = data.saved_jobs;
        syncSavedLocalStorage(data.saved_jobs);
        saveTrackerState();
        return;
      }
    }
  } catch (err) {
    console.warn("Saved jobs fetch failed", err);
  }

  if (!ids.length) {
    syncSavedJobsToTracker();
    return;
  }

  const catalog = await fetchJobsCatalog();
  const byId = Object.fromEntries(
    catalog.map((job) => [normalizeId(job.id), job])
  );

  trackerState.saved = ids
    .map((id) => byId[normalizeId(id)])
    .filter(Boolean);

  syncSavedLocalStorage(trackerState.saved);
  saveTrackerState();
}

function syncSavedJobsToTracker() {
  const savedJobs = getSavedJobs();

  const trackedIds = Object.values(trackerState)
    .flat()
    .map((job) => normalizeId(job.id));

  const missingSaved = savedJobs.filter(
    (job) => !trackedIds.includes(normalizeId(job.id))
  );

  if (missingSaved.length > 0) {
    trackerState.saved = [...(trackerState.saved || []), ...missingSaved];
    saveTrackerState();
  }
}

async function deleteSavedJobOnServer(jobId) {
  const code = getProgressCode();
  if (!code) return;

  try {
    await fetch(`${window.location.origin}/saved-jobs/${jobId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch {
    /* Ignore server delete errors so local remove still works */
  }
}

/* =========================
   CONFETTI
========================= */

function launchConfetti() {
  for (let i = 0; i < 90; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";

    confetti.style.left = Math.random() * window.innerWidth + "px";
    confetti.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
    confetti.style.animationDelay = Math.random() * 0.25 + "s";
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

    const colors = [
      "#3a86ff",
      "#8338ec",
      "#06d6a0",
      "#ffb703",
      "#ff006e",
      "#fb5607",
    ];

    confetti.style.background =
      colors[Math.floor(Math.random() * colors.length)];

    document.body.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 5000);
  }
}

/* =========================
   COUNTS
========================= */

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

/* =========================
   MODAL
========================= */

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

    <h3>Required Skills</h3>
    <ul>
      ${
        (job.skills_required || [])
          .map((skill) => `<li>${skill}</li>`)
          .join("") || "<li>No skills listed.</li>"
      }
    </ul>

    ${
      job.apply_link
        ? `<a class="apply-btn" href="${job.apply_link}" target="_blank">Apply Now</a>`
        : ""
    }
  `;

  modal.classList.remove("hidden");
}

/* =========================
   REMOVE JOB
========================= */

function removeJob(id, status) {
  const cards = document.querySelectorAll(".mini-job");

  cards.forEach((card) => {
    if (normalizeId(card.dataset.id) !== normalizeId(id)) return;

    card.animate(
      [
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(0.6)", opacity: 0 },
      ],
      {
        duration: 250,
        easing: "ease",
        fill: "forwards",
      }
    );

    setTimeout(async () => {
      trackerState[status] = trackerState[status].filter(
        (job) => normalizeId(job.id) !== normalizeId(id)
      );

      if (status === "saved") {
        await deleteSavedJobOnServer(id);

        const savedJobs = getSavedJobs();

        localStorage.setItem(
          "savedJobs",
          JSON.stringify(
            savedJobs.filter((job) => normalizeId(job.id) !== normalizeId(id))
          )
        );
      }

      saveTrackerState();
      renderTracker();
    }, 250);
  });
}

/* =========================
   RENDER TRACKER
========================= */

function renderTracker() {
  Object.values(trackerColumns).forEach((column) => {
    if (column) column.innerHTML = "";
  });

  Object.keys(trackerState).forEach((status) => {
    const column = trackerColumns[status];
    if (!column) return;

    if (trackerState[status].length === 0) {
      column.innerHTML =
        status === "saved"
          ? `<div class="empty-column">No saved jobs yet. Save roles from the Jobs page.</div>`
          : `<div class="empty-column">Drop jobs here</div>`;
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
        draggedJob = {
          job,
          from: status,
        };

        card.classList.add("dragging");
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
      });

      card.querySelector(".view-btn").addEventListener("click", () => {
        openTrackerModal(job);
      });

      card.querySelector(".remove-btn").addEventListener("click", () => {
        removeJob(job.id, status);
      });

      column.appendChild(card);
    });
  });

  updateCounts();
}

/* =========================
   DRAG + DROP
========================= */

Object.keys(trackerColumns).forEach((status) => {
  const column = trackerColumns[status];
  if (!column) return;

  column.addEventListener("dragover", (e) => {
    e.preventDefault();
    column.classList.add("drag-over");
  });

  column.addEventListener("dragleave", () => {
    column.classList.remove("drag-over");
  });

  column.addEventListener("drop", (e) => {
    e.preventDefault();
    column.classList.remove("drag-over");

    if (!draggedJob) return;

    const { job, from } = draggedJob;

    trackerState[from] = trackerState[from].filter(
      (item) => normalizeId(item.id) !== normalizeId(job.id)
    );

    const exists = trackerState[status].some(
      (item) => normalizeId(item.id) === normalizeId(job.id)
    );

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

/* =========================
   MODAL EVENTS
========================= */

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

/* =========================
   INITIAL RENDER
========================= */

async function initTracker() {
  await hydrateSavedFromBackend();
  syncSavedJobsToTracker();
  renderTracker();
}

initTracker();