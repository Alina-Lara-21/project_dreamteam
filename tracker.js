//////////////////////////////////////////////////////
// TRACKER STORAGE
//////////////////////////////////////////////////////

function getSavedJobs() {
  return JSON.parse(localStorage.getItem("savedJobs")) || [];
}

function getTrackerBoard() {
  return JSON.parse(localStorage.getItem("jobTrackerBoard")) || {
    applied: [],
    interview: [],
    offer: []
  };
}

function saveTrackerBoard(board) {
  localStorage.setItem("jobTrackerBoard", JSON.stringify(board));
}

//////////////////////////////////////////////////////
// SYNC SAVED JOBS INTO BOARD
//////////////////////////////////////////////////////

function syncSavedJobsIntoBoard() {
  const savedJobs = getSavedJobs();
  const board = getTrackerBoard();

  const allBoardIds = [
    ...board.applied,
    ...board.interview,
    ...board.offer
  ];

  // Add new saved jobs into Applied automatically
  savedJobs.forEach(job => {
    if (!allBoardIds.includes(job.id)) {
      board.applied.push(job.id);
    }
  });

  // Remove jobs that are no longer saved
  const savedIds = savedJobs.map(j => j.id);

  board.applied = board.applied.filter(id => savedIds.includes(id));
  board.interview = board.interview.filter(id => savedIds.includes(id));
  board.offer = board.offer.filter(id => savedIds.includes(id));

  saveTrackerBoard(board);
}

//////////////////////////////////////////////////////
// RENDER BOARD
//////////////////////////////////////////////////////

function renderBoard() {
  const savedJobs = getSavedJobs();
  const board = getTrackerBoard();

  document.getElementById("appliedZone").innerHTML = "";
  document.getElementById("interviewZone").innerHTML = "";
  document.getElementById("offerZone").innerHTML = "";

  function createCard(job, status) {
    const card = document.createElement("div");
    card.className = "mini-job";
    card.draggable = true;
    card.dataset.jobId = job.id;
    card.dataset.status = status;

    card.innerHTML = `
      <strong>${job.title}</strong>
      <p style="margin-top:4px;font-size:0.85rem;color:#555;">
        ${job.company} • ${job.location || "N/A"}
      </p>

      <div class="tracker-actions">
        <button class="details-btn">Details</button>
        <button class="remove-btn">Remove</button>
      </div>
    `;

    // Drag start
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", job.id);
      e.dataTransfer.setData("fromStatus", status);
      card.style.opacity = "0.5";
    });

    // Drag end
    card.addEventListener("dragend", () => {
      card.style.opacity = "1";
    });

    // Details button
    card.querySelector(".details-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(job);
    });

    // Remove button
    card.querySelector(".remove-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      removeJobFromTracker(job.id);
    });

    // Clicking the card also opens modal
    card.addEventListener("click", () => {
      openModal(job);
    });

    return card;
  }

  function getJobById(id) {
    return savedJobs.find(j => j.id === id);
  }

  board.applied.forEach(id => {
    const job = getJobById(id);
    if (job) document.getElementById("appliedZone").appendChild(createCard(job, "applied"));
  });

  board.interview.forEach(id => {
    const job = getJobById(id);
    if (job) document.getElementById("interviewZone").appendChild(createCard(job, "interview"));
  });

  board.offer.forEach(id => {
    const job = getJobById(id);
    if (job) document.getElementById("offerZone").appendChild(createCard(job, "offer"));
  });
}

//////////////////////////////////////////////////////
// DRAG + DROP
//////////////////////////////////////////////////////

function enableDragDrop() {
  const zones = document.querySelectorAll(".drop-zone");

  zones.forEach(zone => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.style.background = "#edf2fb";
    });

    zone.addEventListener("dragleave", () => {
      zone.style.background = "transparent";
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.style.background = "transparent";

      const jobId = parseInt(e.dataTransfer.getData("text/plain"));
      const fromStatus = e.dataTransfer.getData("fromStatus");
      const toStatus = zone.parentElement.dataset.status;

      moveJob(jobId, fromStatus, toStatus);
    });
  });
}

//////////////////////////////////////////////////////
// MOVE JOB BETWEEN COLUMNS
//////////////////////////////////////////////////////

function moveJob(jobId, fromStatus, toStatus) {
  if (fromStatus === toStatus) return;

  const board = getTrackerBoard();

  board[fromStatus] = board[fromStatus].filter(id => id !== jobId);

  if (!board[toStatus].includes(jobId)) {
    board[toStatus].push(jobId);
  }

  saveTrackerBoard(board);
  renderBoard();
}

//////////////////////////////////////////////////////
// REMOVE JOB FROM TRACKER (NOT SAVED JOBS)
//////////////////////////////////////////////////////

function removeJobFromTracker(jobId) {
  const board = getTrackerBoard();

  board.applied = board.applied.filter(id => id !== jobId);
  board.interview = board.interview.filter(id => id !== jobId);
  board.offer = board.offer.filter(id => id !== jobId);

  saveTrackerBoard(board);
  renderBoard();
}

//////////////////////////////////////////////////////
// MODAL
//////////////////////////////////////////////////////

function openModal(job) {
  const modal = document.getElementById("trackerModal");
  const details = document.getElementById("trackerJobDetails");

  details.innerHTML = `
    <h2>${job.title}</h2>
    <p><strong>${job.company}</strong> • ${job.location || "Location not listed"}</p>

    <div style="margin-top:12px;">
      <span class="tag">${job.salary_range || "Salary not listed"}</span>
      <span class="tag">${job.type || "Type not listed"}</span>
    </div>

    <hr style="margin:15px 0;">

    <h3>Description</h3>
    <p>${job.description || "No description available."}</p>

    <h3>Required Skills</h3>
    <ul>
      ${(job.skills_required || []).map(skill => `<li>${skill}</li>`).join("")}
    </ul>
  `;

  modal.classList.remove("hidden");
}

document.getElementById("closeTrackerModal").addEventListener("click", () => {
  document.getElementById("trackerModal").classList.add("hidden");
});

//////////////////////////////////////////////////////
// INIT
//////////////////////////////////////////////////////

function initTracker() {
  syncSavedJobsIntoBoard();
  renderBoard();
  enableDragDrop();
}

initTracker();