/* ============================================================
   script.js — AttendanceIQ Dashboard
   Fetches data from Google Apps Script, renders charts & table
   ============================================================ */

// ── !! CONFIGURE YOUR GOOGLE APPS SCRIPT URL HERE !! ────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
// ────────────────────────────────────────────────────────────

/* ── AUTH GUARD ─────────────────────────────────────────── */
if (sessionStorage.getItem("att_auth") !== "true") {
  window.location.replace("index.html");
}
const userEmail = sessionStorage.getItem("att_email") || "teacher";
document.getElementById("navUser").textContent = userEmail;

/* ── GLOBAL STATE ───────────────────────────────────────── */
let allRecords     = [];   // raw records: [{name, roll, date}, ...]
let studentMap     = {};   // {roll: {name, roll, dates: Set, sessions: []}}
let sessionDates   = [];   // sorted unique dates
let filteredData   = [];   // current table rows

/* ── INIT ───────────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", async () => {
  await loadData();
});

/* ── DATA LOADING ───────────────────────────────────────── */
async function loadData() {
  showLoader(true);
  try {
    const url = `${APPS_SCRIPT_URL}?mode=read&t=${Date.now()}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    processData(raw);
    renderDashboard();
  } catch (err) {
    console.error("Failed to load:", err);
    // Use demo data when offline / during development
    processData(getDemoData());
    renderDashboard();
    showBanner("⚠ Using demo data — update APPS_SCRIPT_URL in script.js");
  } finally {
    showLoader(false);
    document.getElementById("dashMain").style.display = "block";
  }
}

/* ── PROCESS RAW DATA ───────────────────────────────────── */
function processData(raw) {
  // raw can be [{name, roll}] (no date) or [{name, roll, date}]
  // If no date field, treat all records as today
  const today = formatDate(new Date());

  allRecords = raw.map(r => ({
    name: r.name || r.Name || "Unknown",
    roll: String(r.roll || r.Roll || "—"),
    date: r.date || r.Date || today
  }));

  // Build student map
  studentMap = {};
  const dateSet = new Set();

  allRecords.forEach(rec => {
    const key = rec.roll;
    if (!studentMap[key]) {
      studentMap[key] = { name: rec.name, roll: rec.roll, dates: new Set(), lastSeen: "" };
    }
    studentMap[key].dates.add(rec.date);
    studentMap[key].lastSeen = rec.date;
    dateSet.add(rec.date);
  });

  sessionDates = [...dateSet].sort();
}

/* ── RENDER ALL ─────────────────────────────────────────── */
function renderDashboard() {
  const students   = Object.values(studentMap);
  const totalClass = sessionDates.length;
  const totalStud  = students.length;
  const avgPct     = totalStud === 0 ? 0 :
    Math.round(students.reduce((a, s) => a + (s.dates.size / totalClass) * 100, 0) / totalStud);

  // Stat cards
  setEl("statClasses",  totalClass);
  setEl("statStudents", totalStud);
  setEl("statAvg",      `${avgPct}%`);
  setEl("statLast",     sessionDates[sessionDates.length - 1] || "—");

  renderBarChart();
  renderDonutChart(avgPct);
  renderSessionCards();
  populateDateFilter();
  filteredData = students;
  renderTable(students);
}

/* ── BAR CHART ──────────────────────────────────────────── */
let barInstance;
function renderBarChart() {
  const labels = sessionDates.map(d => d); // date strings
  const data   = sessionDates.map(date => {
    return allRecords.filter(r => r.date === date).length;
  });

  document.getElementById("classBadge").textContent = `${sessionDates.length} sessions`;

  const ctx = document.getElementById("barChart").getContext("2d");
  if (barInstance) barInstance.destroy();

  barInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Students Present",
        data,
        backgroundColor: "rgba(245,166,35,0.6)",
        borderColor:     "rgba(245,166,35,1)",
        borderWidth: 1,
        borderRadius: 5,
        hoverBackgroundColor: "rgba(245,166,35,0.85)"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1a1a24",
          borderColor: "#2a2a38",
          borderWidth: 1,
          titleColor: "#f5a623",
          bodyColor: "#e8e8f0"
        }
      },
      scales: {
        x: {
          ticks: { color: "#8888aa", font: { family: "'Space Mono', monospace", size: 10 } },
          grid:  { color: "rgba(255,255,255,0.04)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#8888aa", font: { family: "'Space Mono', monospace", size: 10 }, precision: 0 },
          grid:  { color: "rgba(255,255,255,0.04)" }
        }
      }
    }
  });
}

/* ── DONUT CHART ────────────────────────────────────────── */
let donutInstance;
function renderDonutChart(avgPct) {
  document.getElementById("donutPct").textContent = `${avgPct}%`;

  const ctx = document.getElementById("donutChart").getContext("2d");
  if (donutInstance) donutInstance.destroy();

  donutInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent"],
      datasets: [{
        data: [avgPct, 100 - avgPct],
        backgroundColor: ["rgba(245,166,35,0.85)", "rgba(42,42,56,0.8)"],
        borderColor:     ["rgba(245,166,35,1)",    "rgba(56,56,80,1)"],
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: "72%",
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#8888aa", font: { size: 11 }, padding: 16, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: "#1a1a24",
          borderColor: "#2a2a38",
          borderWidth: 1,
          titleColor: "#f5a623",
          bodyColor: "#e8e8f0",
          callbacks: { label: ctx => ` ${ctx.parsed}%` }
        }
      }
    }
  });
}

/* ── SESSION CARDS ──────────────────────────────────────── */
function renderSessionCards() {
  const grid = document.getElementById("sessionsGrid");
  if (!sessionDates.length) {
    grid.innerHTML = `<p class="loading-row">No sessions found.</p>`;
    return;
  }
  grid.innerHTML = sessionDates.map((date, i) => {
    const count = allRecords.filter(r => r.date === date).length;
    return `
      <div class="session-card">
        <div class="session-date">${date}</div>
        <div class="session-count">${count}</div>
        <div class="session-label">students present · Session ${i + 1}</div>
      </div>`;
  }).join("");
}

/* ── DATE FILTER DROPDOWN ───────────────────────────────── */
function populateDateFilter() {
  const sel = document.getElementById("dateFilter");
  sel.innerHTML = `<option value="all">All Sessions</option>`;
  sessionDates.forEach(d => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

/* ── TABLE ──────────────────────────────────────────────── */
function renderTable(students) {
  const tbody = document.getElementById("attBody");
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row">No records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map((s, i) => {
    const present = s.dates.size;
    const total   = sessionDates.length || 1;
    const pct     = Math.round((present / total) * 100);
    const pctClass = pct >= 75 ? "pct-high" : pct >= 50 ? "pct-mid" : "pct-low";
    const dots    = sessionDates.map(d =>
      `<div class="dot ${s.dates.has(d) ? 'dot-present' : 'dot-absent'}" title="${d}: ${s.dates.has(d) ? 'Present' : 'Absent'}"></div>`
    ).join("");

    return `
      <tr>
        <td style="color:var(--text2);font-family:var(--mono)">${i + 1}</td>
        <td style="font-weight:500">${escHtml(s.name)}</td>
        <td style="font-family:var(--mono);color:var(--accent)">${escHtml(s.roll)}</td>
        <td style="font-family:var(--mono)">${present}</td>
        <td style="font-family:var(--mono)">${sessionDates.length}</td>
        <td><span class="pct-pill ${pctClass}">${pct}%</span></td>
        <td style="font-family:var(--mono);font-size:0.78rem;color:var(--text2)">${s.lastSeen}</td>
        <td><div class="dot-row">${dots}</div></td>
      </tr>`;
  }).join("");
}

/* ── FILTER ─────────────────────────────────────────────── */
function filterTable() {
  const query  = document.getElementById("searchInput").value.toLowerCase();
  const date   = document.getElementById("dateFilter").value;

  let base = Object.values(studentMap);

  // If specific date selected, only show students present that day
  if (date !== "all") {
    base = base.filter(s => s.dates.has(date));
  }

  // Text search
  if (query) {
    base = base.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.roll.toLowerCase().includes(query)
    );
  }

  filteredData = base;
  renderTable(filteredData);
}

/* ── LOGOUT ─────────────────────────────────────────────── */
function logout() {
  sessionStorage.removeItem("att_auth");
  sessionStorage.removeItem("att_email");
  window.location.replace("index.html");
}

/* ── HELPERS ────────────────────────────────────────────── */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showLoader(on) {
  document.getElementById("loaderOverlay").style.display = on ? "flex" : "none";
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function showBanner(msg) {
  const b = document.createElement("div");
  b.style.cssText = "position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#1a1a24;border:1px solid rgba(245,166,35,0.4);color:#f5a623;font-family:'Space Mono',monospace;font-size:0.75rem;padding:10px 20px;border-radius:8px;z-index:9999;";
  b.textContent = msg;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 6000);
}

/* ── DEMO DATA (remove or replace with real API) ────────── */
function getDemoData() {
  const students = [
    { name: "Pratim Deka",       roll: "033" },
    { name: "Nabajyoti Borah",   roll: "026" },
    { name: "Ankita Sharma",     roll: "012" },
    { name: "Rohit Kumar",       roll: "045" },
    { name: "Priya Gogoi",       roll: "018" },
    { name: "Sourav Das",        roll: "052" },
  ];
  const dates = ["2025-06-01","2025-06-03","2025-06-05","2025-06-08","2025-06-10","2025-06-12"];
  const records = [];
  students.forEach(s => {
    dates.forEach((d, i) => {
      if (Math.random() > 0.3) records.push({ name: s.name, roll: s.roll, date: d });
    });
  });
  return records;
}
