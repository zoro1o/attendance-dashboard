const url = "YOUR_SCRIPT_URL?mode=read";

fetch(url)
.then(res => res.json())
.then(data => {

let count = {};
let table = document.getElementById("attendanceTable");

data.forEach(student => {

let key = student.name + "_" + student.roll;

if(!count[key])
count[key] = 0;

count[key]++;

});

let names = [];
let percentages = [];

let totalClasses = 20; // change later

for(let key in count)
{

let parts = key.split("_");
let name = parts[0];
let roll = parts[1];

let percent = (count[key] / totalClasses) * 100;

names.push(name);
percentages.push(percent);

let row = table.insertRow();

row.insertCell(0).innerHTML = name;
row.insertCell(1).innerHTML = roll;
row.insertCell(2).innerHTML = percent.toFixed(1) + "%";

}

createChart(names,percentages);

});

function createChart(names,percentages)
{

new Chart(document.getElementById("attendanceChart"), {

type: 'bar',

data: {
labels: names,
datasets: [{
label: "Attendance %",
data: percentages
}]
}

});

}