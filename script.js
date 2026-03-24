async function getJobs(){
const res = await fetch("jobs.json");
return await res.json();
}

function createJobCard(job){

const card=document.createElement("div");
card.className="job-card";

card.innerHTML=`
<h3>${job.title}</h3>
<p>${job.company}</p>
<p>${job.location}</p>
<button class="save-btn">Save Job</button>
`;

card.onclick=()=>{
window.location=`job.html?id=${job.id}`;
};

card.querySelector("button").onclick=(e)=>{
e.stopPropagation();
saveJob(job.id);
};

return card;
}

async function loadAllJobs(){

const jobs=await getJobs();
const container=document.getElementById("jobResults");

jobs.forEach(job=>{
container.appendChild(createJobCard(job));
});

}

async function findJobs(){

const skills=document.getElementById("skills").value.toLowerCase();

const jobs=await getJobs();

const matches=jobs.filter(job =>
job.skills.some(skill => skills.includes(skill))
);

const container=document.getElementById("jobResults");
container.innerHTML="";

matches.forEach(job=>{
container.appendChild(createJobCard(job));
});

}

function saveJob(id){

let saved=JSON.parse(localStorage.getItem("savedJobs")) || [];

if(!saved.includes(id)){
saved.push(id);
}

localStorage.setItem("savedJobs",JSON.stringify(saved));

alert("Job saved!");
}

async function loadSavedJobs(){

const container=document.getElementById("savedJobs");
if(!container) return;

const saved=JSON.parse(localStorage.getItem("savedJobs")) || [];
const jobs=await getJobs();

saved.forEach(id=>{
const job=jobs.find(j=>j.id==id);
container.appendChild(createJobCard(job));
});

}

async function loadJobDetails(){

const params=new URLSearchParams(window.location.search);
const id=params.get("id");

if(!id) return;

const jobs=await getJobs();
const job=jobs.find(j=>j.id==id);

const container=document.getElementById("jobDetails");

if(container){

container.innerHTML=`
<h2>${job.title}</h2>
<h3>${job.company}</h3>
<p><b>Location:</b> ${job.location}</p>

<h4>Description</h4>
<p>${job.description}</p>

<h4>Requirements</h4>
<p>${job.requirements}</p>

<button onclick="saveJob(${job.id})"
class="btn btn-primary">
Save Job
</button>
`;

}

}

loadSavedJobs();
loadJobDetails();