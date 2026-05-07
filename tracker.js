/* =========================
   TRACKER.JS
========================= */

const trackerColumns = {
  saved: document.getElementById("savedColumn"),
  applied: document.getElementById("appliedColumn"),
  interview: document.getElementById("interviewColumn"),
  offer: document.getElementById("offerColumn")
};

let draggedJob = null;

/* =========================
   LOAD SAVED JOBS
========================= */

const savedJobs =
  JSON.parse(localStorage.getItem("savedJobs")) || [];

/* =========================
   LOAD TRACKER STATE
========================= */

let trackerState =
  JSON.parse(localStorage.getItem("trackerState"));

if (!trackerState) {

  trackerState = {
    saved: savedJobs,
    applied: [],
    interview: [],
    offer: []
  };

  saveTrackerState();
} else {
  syncSavedJobsToTracker();
}

/* =========================
   SAVE STATE
========================= */

function saveTrackerState() {

  localStorage.setItem(
    "trackerState",
    JSON.stringify(trackerState)
  );

}
function syncSavedJobsToTracker() {
  const savedJobs = JSON.parse(localStorage.getItem("savedJobs")) || [];
  const trackedIds = Object.values(trackerState)
    .flat()
    .map(job => job.id);

  const missingSaved = savedJobs.filter(
    job => !trackedIds.includes(job.id)
  );

  if (missingSaved.length > 0) {
    trackerState.saved = [
      ...(trackerState.saved || []),
      ...missingSaved
    ];
    saveTrackerState();
  }
}
/* =========================
   CONFETTI EFFECT
========================= */

function launchConfetti() {

  for (let i = 0; i < 80; i++) {

    const confetti =
      document.createElement("div");

    confetti.className = "confetti";

    confetti.style.left =
      Math.random() * window.innerWidth + "px";

    confetti.style.animationDuration =
      1.8 + Math.random() * 1.8 + "s";

    confetti.style.animationDelay =
      Math.random() * 0.25 + "s";

    confetti.style.transform =
      `rotate(${Math.random() * 360}deg)`;

    const colors = [
      "#3a86ff",
      "#8338ec",
      "#06d6a0",
      "#ffb703",
      "#ff006e"
    ];

    confetti.style.background =
      colors[Math.floor(Math.random() * colors.length)];

    confetti.style.borderRadius = "2px";
    confetti.style.animationTimingFunction = "ease-out";

    document.body.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 5000);

  }

}

/* =========================
   REMOVE JOB
========================= */

function removeJob(id, status) {

  const cards =
    document.querySelectorAll(".mini-job");

  cards.forEach(card => {

    if (card.dataset.id == id) {

      card.classList.add("pop-remove");
      card.style.transformOrigin = "center center";
      card.animate(
        [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(0.6)", opacity: 0 }
        ],
        {
          duration: 250,
          easing: "ease",
          fill: "forwards"
        }
      );

      setTimeout(() => {
        trackerState[status] =
          trackerState[status].filter(
            job => job.id !== id
          );

        if (status === "saved") {
          const savedJobs = JSON.parse(
            localStorage.getItem("savedJobs")
          ) || [];

          localStorage.setItem(
            "savedJobs",
            JSON.stringify(
              savedJobs.filter(job => job.id !== id)
            )
          );
        }

        saveTrackerState();
        renderTracker();
      }, 250);

    }

  });

}

/* =========================
   RENDER TRACKER
========================= */

function renderTracker() {

  /* CLEAR COLUMNS */

  Object.values(trackerColumns)
    .forEach(column => {
      column.innerHTML = "";
    });

  /* LOOP THROUGH EACH STATUS */

  Object.keys(trackerState)
    .forEach(status => {

      trackerState[status]
        .forEach(job => {

          const card =
            document.createElement("div");

          card.className = "mini-job";

          card.dataset.id = job.id;

          card.draggable = true;

          card.innerHTML = `
            <strong>${job.title}</strong>
            <p>${job.company}</p>

            <div class="tracker-actions">
              <button onclick="removeJob(${job.id}, '${status}')">
                Remove
              </button>
            </div>
          `;

          /* DRAG START */

          card.addEventListener("dragstart", () => {

            draggedJob = {
              job,
              from: status
            };

          });

          trackerColumns[status]
            .appendChild(card);

        });

    });

}

/* =========================
   DRAG + DROP
========================= */

Object.keys(trackerColumns)
  .forEach(status => {

    const column =
      trackerColumns[status];

    /* ALLOW DROP */

    column.addEventListener(
      "dragover",
      e => {
        e.preventDefault();
      }
    );

    /* DROP EVENT */

    column.addEventListener(
      "drop",
      () => {

        if (!draggedJob) return;

        const { job, from } =
          draggedJob;

        /* REMOVE FROM OLD COLUMN */

        trackerState[from] =
          trackerState[from]
            .filter(j => j.id !== job.id);

        /* PREVENT DUPLICATES */

        const exists =
          trackerState[status]
            .some(j => j.id === job.id);

        if (!exists) {

          trackerState[status]
            .push(job);

          /* CONFETTI ON OFFER */
          if (status === "offer") {
            launchConfetti();
          }

        }

        saveTrackerState();

        renderTracker();

        draggedJob = null;

      }
    );

});

/* =========================
   INITIAL RENDER
========================= */

renderTracker();