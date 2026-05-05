function loadCompareJobs() {
  return JSON.parse(localStorage.getItem("compareJobs")) || [];
}

function clearCompareJobs() {
  localStorage.removeItem("compareJobs");
  renderCompare();
}

function renderCompare() {
  const grid = document.getElementById("compareGrid");
  const jobs = loadCompareJobs();

  grid.innerHTML = "";

  if (jobs.length === 0) {
    grid.innerHTML = `
      <div class="empty-compare">
        <h3>No jobs selected yet</h3>
        <p>Go to the Jobs page and click Compare on any job.</p>
      </div>
    `;
    return;
  }

  jobs.forEach(job => {
    const card = document.createElement("div");
    card.className = "compare-card";

    card.innerHTML = `
      <div class="compare-top">
        <h3>${job.title}</h3>
        <p>${job.company} • ${job.location || "Location not listed"}</p>
        <span class="tag">${job.salary_range || "Salary not listed"}</span>
      </div>

      <div class="compare-section">
        <h4>Required Skills</h4>
        <ul>${(job.skills_required || []).map(r => `<li>${r}</li>`).join("")}</ul>
      </div>
    `;

    grid.appendChild(card);
  });
}

document.getElementById("clearCompareBtn").addEventListener("click", clearCompareJobs);

renderCompare();