function normalizeList(str) {
  if (!str) return [];
  return str.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
}

function countMatches(userList, jobList) {
  let count = 0;

  userList.forEach(u => {
    jobList.forEach(j => {
      if (j.toLowerCase().includes(u)) {
        count++;
      }
    });
  });

  return count;
}

function calculateMatchScore(user, job) {
  const skills = normalizeList(user.skills);
  const coursework = normalizeList(user.coursework);
  const experience = normalizeList(user.experience);

  let score = 0;

  // 🔥 Weighted scoring
  score += countMatches(skills, job.requirements || []) * 5;
  score += countMatches(coursework, job.coursework || []) * 3;
  score += countMatches(experience, job.experience || []) * 3;

  // 🔥 Job type preference boost
  if (user.types && user.types.includes(job.type)) {
    score += 6;
  }

  return score;
}