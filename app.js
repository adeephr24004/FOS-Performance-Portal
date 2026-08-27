// ==========================================
// FOS PERFORMANCE PORTAL - LIVE DATA
// ==========================================

const API_URL =
   "https://script.google.com/macros/s/AKfycbwtZn7_c4J_xMBojwbUp-rP9nmzh9gobMxcGRsTP6awP7y8Ea6N49fnO10VmoyFT8M/exec";
let allData = [];
let headers = [];


// ==========================================
// LOAD DATA FROM GOOGLE SHEET
// ==========================================

async function loadData() {

  try {

    showLoading(true);

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Unable to connect to Google Sheet");
    }

    const result = await response.json();

    // New Apps Script format
    if (result.success === false) {
      throw new Error(result.error || "Unable to load data");
    }

    allData = result.data || [];

    if (allData.length === 0) {
      throw new Error("No data found in FOS tracker sheet");
    }

    // Automatically get ALL columns from the sheet
    headers = Object.keys(allData[0]);

    console.log("Live data loaded:", allData.length);
    console.log("Columns found:", headers);

    renderPortal();

    showLoading(false);

  } catch (error) {

    console.error(error);

    showLoading(false);

    alert(
      "Unable to load live data.\n\n" +
      error.message +
      "\n\nPlease check your Google Apps Script deployment."
    );
  }

}


// ==========================================
// RENDER PORTAL
// ==========================================

function renderPortal() {

  // Find table container
  const tableContainer =
    document.getElementById("tableContainer") ||
    document.querySelector(".table-container");

  if (tableContainer) {
    renderTable(tableContainer);
  }

  // Update summary cards if they exist
  updateSummary();

}


// ==========================================
// CREATE TABLE AUTOMATICALLY
// ==========================================

function renderTable(container) {

  container.innerHTML = "";

  const table = document.createElement("table");

  table.className = "data-table";


  // ---------- TABLE HEADER ----------

  const thead = document.createElement("thead");

  const headerRow = document.createElement("tr");

  headers.forEach(header => {

    const th = document.createElement("th");

    th.textContent = header;

    headerRow.appendChild(th);

  });

  thead.appendChild(headerRow);

  table.appendChild(thead);


  // ---------- TABLE BODY ----------

  const tbody = document.createElement("tbody");

  allData.forEach(row => {

    const tr = document.createElement("tr");

    headers.forEach(header => {

      const td = document.createElement("td");

      td.textContent = row[header] ?? "";

      tr.appendChild(td);

    });

    tbody.appendChild(tr);

  });

  table.appendChild(tbody);

  container.appendChild(table);

}


// ==========================================
// SUMMARY
// ==========================================

function updateSummary() {

  // Total Members
  const totalElement =
    document.getElementById("totalMembers");

  if (totalElement) {
    totalElement.textContent = allData.length;
  }


  // Active Members
  const activeElement =
    document.getElementById("activeMembers");

  if (activeElement) {

    const activeMembers = allData.filter(row => {

      const value =
        String(row["IsActive"] || "")
          .toLowerCase()
          .trim();

      return (
        value === "true" ||
        value === "yes" ||
        value === "active" ||
        value === "1"
      );

    });

    activeElement.textContent = activeMembers.length;

  }


  // Trainer count
  const trainerElement =
    document.getElementById("trainerCount");

  if (trainerElement) {

    const trainers = new Set();

    allData.forEach(row => {

      if (row["Trainer"]) {
        trainers.add(row["Trainer"]);
      }

    });

    trainerElement.textContent = trainers.size;

  }

}


// ==========================================
// REFRESH LIVE DATA
// ==========================================

function refreshLiveData() {

  loadData();

}


// ==========================================
// LOADING SCREEN
// ==========================================

function showLoading(show) {

  const loader =
    document.getElementById("loadingScreen");

  if (!loader) return;

  if (show) {
    loader.style.display = "flex";
  } else {
    loader.style.display = "none";
  }

}


// ==========================================
// AUTO REFRESH EVERY 5 MINUTES
// ==========================================

setInterval(() => {

  console.log("Auto refreshing live data...");

  loadData();

}, 300000);


// ==========================================
// START
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

  loadData();

});
