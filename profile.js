const nameInput = document.getElementById("profileName");
const emailInput = document.getElementById("profileEmail");
const skillsInput = document.getElementById("profileSkills");
const courseworkInput = document.getElementById("profileCoursework");
const experienceInput = document.getElementById("profileExperience");
const locationInput = document.getElementById("profileLocation");

const resumeUpload = document.getElementById("resumeUpload");
const resumePreview = document.getElementById("resumePreview");

const saveBtn = document.getElementById("saveProfileBtn");
const clearBtn = document.getElementById("clearProfileBtn");

const bubbles = document.querySelectorAll(".bubble");
let selectedTypes = [];

// Profile tag arrays
let profileSkills = [];
let profileCoursework = [];
let profileExperience = [];

// Header elements
const profileAvatar = document.getElementById("profileAvatar");
const profileHeaderName = document.getElementById("profileHeaderName");
const profilePercent = document.getElementById("profilePercent");
const progressFill = document.getElementById("progressFill");

// Stats elements
const profileSavedJobs = document.getElementById("profileSavedJobs");
const profileCompareJobs = document.getElementById("profileCompareJobs");
const profileTrackerJobs = document.getElementById("profileTrackerJobs");

// ------------------------------
// Tag Bubble System
// ------------------------------
function renderTagBubbles(containerId, listRef) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();

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

    fragment.appendChild(bubble);
  });

  container.appendChild(fragment);
}

function setupBubbleInput(inputId, containerId, listRef) {
  const input = document.getElementById(inputId);

  input.addEventListener("input", () => {
    if (input.value.includes(",")) {
      const parts = input.value.split(",");

      parts.slice(0, -1).forEach(part => {
        const value = part.trim();
        if (value && !listRef.includes(value)) {
          listRef.push(value);
        }
      });

      input.value = parts[parts.length - 1].trim();
      renderTagBubbles(containerId, listRef);
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const value = input.value.trim();
      if (!value) return;

      if (!listRef.includes(value)) {
        listRef.push(value);
      }

      input.value = "";
      renderTagBubbles(containerId, listRef);
    }

    if (e.key === "Backspace" && input.value.trim() === "" && listRef.length > 0) {
      listRef.pop();
      renderTagBubbles(containerId, listRef);
    }
  });
}

// ------------------------------
// Update Profile Completion
// ------------------------------
function updateProfileProgress() {
  let filled = 0;
  let total = 6;

  if (nameInput.value.trim() !== "") filled++;
  if (emailInput.value.trim() !== "") filled++;
  if (profileSkills.length > 0) filled++;
  if (profileCoursework.length > 0) filled++;
  if (profileExperience.length > 0) filled++;
  if (locationInput.value.trim() !== "") filled++;

  const percent = Math.round((filled / total) * 100);

  profilePercent.innerText = `${percent}%`;
  progressFill.style.width = `${percent}%`;
}

// ------------------------------
// Update Avatar + Header Name
// ------------------------------
function updateProfileHeader() {
  const name = nameInput.value.trim();

  if (name !== "") {
    profileHeaderName.innerText = name;

    const initials = name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    profileAvatar.innerText = initials;
  } else {
    profileHeaderName.innerText = "My Profile";
    profileAvatar.innerText = "U";
  }
}

// ------------------------------
// Update Stats Counts
// ------------------------------
function updateProfileStats() {
  const savedJobs = JSON.parse(localStorage.getItem("savedJobs")) || [];
  const compareJobs = JSON.parse(localStorage.getItem("compareJobs")) || [];

  const tracker = JSON.parse(localStorage.getItem("tracker")) || {
    saved: [],
    applied: [],
    interview: [],
    offer: []
  };

  const totalTracker =
    tracker.saved.length +
    tracker.applied.length +
    tracker.interview.length +
    tracker.offer.length;

  profileSavedJobs.innerText = savedJobs.length;
  profileCompareJobs.innerText = compareJobs.length;
  profileTrackerJobs.innerText = totalTracker;
}

// ------------------------------
// Load profile
// ------------------------------
function loadProfile() {
  const profile = JSON.parse(localStorage.getItem("userProfile"));
  if (!profile) return;

  nameInput.value = profile.name || "";
  emailInput.value = profile.email || "";

  // Handle both old string format and new array format
  if (Array.isArray(profile.skills)) {
    profileSkills = profile.skills;
  } else if (typeof profile.skills === 'string') {
    profileSkills = profile.skills.split(',').map(s => s.trim()).filter(s => s);
  } else {
    profileSkills = [];
  }

  if (Array.isArray(profile.coursework)) {
    profileCoursework = profile.coursework;
  } else if (typeof profile.coursework === 'string') {
    profileCoursework = profile.coursework.split(',').map(s => s.trim()).filter(s => s);
  } else {
    profileCoursework = [];
  }

  if (Array.isArray(profile.experience)) {
    profileExperience = profile.experience;
  } else if (typeof profile.experience === 'string') {
    profileExperience = profile.experience.split(',').map(s => s.trim()).filter(s => s);
  } else {
    profileExperience = [];
  }

  locationInput.value = profile.location || "";

  resumePreview.value = profile.resumeText || "";

  selectedTypes = profile.types || [];

  bubbles.forEach(bubble => {
    const type = bubble.dataset.type;
    if (selectedTypes.includes(type)) {
      bubble.classList.add("active");
    } else {
      bubble.classList.remove("active");
    }
  });

  renderTagBubbles("profileSkillsBubbles", profileSkills);
  renderTagBubbles("profileCourseworkBubbles", profileCoursework);
  renderTagBubbles("profileExperienceBubbles", profileExperience);

  updateProfileHeader();
  updateProfileProgress();
  updateProfileStats();
}

// ------------------------------
// Save profile
// ------------------------------
function saveProfile() {
  const profile = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    skills: profileSkills,
    coursework: profileCoursework,
    experience: profileExperience,
    location: locationInput.value.trim(),
    types: selectedTypes,
    resumeText: resumePreview.value.trim()
  };

  localStorage.setItem("userProfile", JSON.stringify(profile));
  updateProfileHeader();
  updateProfileProgress();

  alert("Profile saved!");
}

// ------------------------------
// Clear profile
// ------------------------------
function clearProfile() {
  localStorage.removeItem("userProfile");

  nameInput.value = "";
  emailInput.value = "";
  profileSkills = [];
  profileCoursework = [];
  profileExperience = [];
  locationInput.value = "";
  resumePreview.value = "";

  selectedTypes = [];
  bubbles.forEach(b => b.classList.remove("active"));

  renderTagBubbles("profileSkillsBubbles", profileSkills);
  renderTagBubbles("profileCourseworkBubbles", profileCoursework);
  renderTagBubbles("profileExperienceBubbles", profileExperience);

  updateProfileHeader();
  updateProfileProgress();
  updateProfileStats();

  alert("Profile cleared.");
}

// ------------------------------
// Bubble Logic
// ------------------------------
bubbles.forEach(bubble => {
  bubble.addEventListener("click", () => {
    const type = bubble.dataset.type;

    if (selectedTypes.includes(type)) {
      selectedTypes = selectedTypes.filter(t => t !== type);
      bubble.classList.remove("active");
    } else {
      selectedTypes.push(type);
      bubble.classList.add("active");
    }

    updateProfileProgress();
  });
});

// ------------------------------
// Resume Upload
// ------------------------------
if (resumeUpload) {
  resumeUpload.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
      const resumeText = e.target.result;
      resumePreview.value = resumeText;

      const extractedSkills = extractSkillsFromResume(resumeText);

      if (extractedSkills.length > 0) {
        extractedSkills.forEach(skill => {
          if (!profileSkills.includes(skill)) {
            profileSkills.push(skill);
          }
        });

        renderTagBubbles("profileSkillsBubbles", profileSkills);
      }

      updateProfileProgress();
      alert("Resume uploaded! Skills were extracted automatically.");
    };

    reader.readAsText(file);
  });
}

// ------------------------------
// Live Updates
// ------------------------------
setupBubbleInput("profileSkills", "profileSkillsBubbles", profileSkills);
setupBubbleInput("profileCoursework", "profileCourseworkBubbles", profileCoursework);
setupBubbleInput("profileExperience", "profileExperienceBubbles", profileExperience);

[nameInput, emailInput, locationInput].forEach(input => {
  input.addEventListener("input", () => {
    updateProfileHeader();
    updateProfileProgress();
  });
});

// ------------------------------
// Button Events
// ------------------------------
saveBtn.addEventListener("click", saveProfile);
clearBtn.addEventListener("click", clearProfile);

// ------------------------------
// Initial Load
// ------------------------------
loadProfile();
updateProfileStats();
updateProfileProgress();
updateProfileHeader();