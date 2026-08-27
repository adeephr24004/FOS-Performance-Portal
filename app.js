// ============================================
// FOS PERFORMANCE PORTAL
// LIVE GOOGLE SHEETS CONNECTION
// ============================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbwtZn7_c4J_xMBojwbUp-rP9nmzh9gobMxcGRsTP6awP7y8Ea6N49fnO10VmoyFT8M/exec";

let allData = [];

// Start when website opens
document.addEventListener("DOMContentLoaded", function () {
  console.log("Starting FOS Performance Portal");
  loadLiveData();
});


// ============================================
// LOAD DATA
// ============================================

async function loadLiveData() {

  try {

    console.log("Loading data from Google Sheet...");

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(
        "Server error: " + response.status
      );
    }

    const result = await response.json();

    console.log("Data received:", result);

    if (!result.success) {
      throw new Error(
        result.error || "Google Sheet returned an error"
      );
    }

    allData = result.data || [];

    console.log(
      "Total records loaded:",
      allData.length
    );

    // Hide loading screen
    hideLoadingScreen();

    // Show data
    displayData();

  } catch (error) {

    console.error("Data loading error:", error);

    hideLoadingScreen();

    showError(
      "Unable to load live data. " +
      "Please refresh the page."
    );

  }

}


// ============================================
// HIDE LOADING SCREEN
// ============================================

function hideLoadingScreen() {

  const loader =
    document.getElementById("loadingScreen");

  if (loader) {

    loader.style.display = "none";

  }

}


// ============================================
// DISPLAY DATA
// ============================================

function displayData() {

  console.log(
    "Website successfully connected to live data."
  );

  // Find existing table body
  const tableBody =
    document.getElementById("tableBody");

  if (!tableBody) {

    console.log(
      "tableBody not found yet. Data is loaded successfully."
    );

    return;

  }

  tableBody.innerHTML = "";

  if (allData.length === 0) {

    tableBody.innerHTML =
      "<tr><td>No data available</td></tr>";

    return;

  }


  // Automatically get ALL columns
  const columns =
    Object.keys(allData[0]);


  // Add rows
  allData.forEach(function (row) {

    const tr =
      document.createElement("tr");


    columns.forEach(function (column) {

      const td =
        document.createElement("td");

      td.textContent =
        row[column] || "";

      tr.appendChild(td);

    });


    tableBody.appendChild(tr);

  });


  updateDashboard();

}


// ============================================
// UPDATE DASHBOARD
// ============================================

function updateDashboard() {

  // Total members
  const totalMembers =
    document.getElementById("totalMembers");

  if (totalMembers) {

    totalMembers.textContent =
      allData.length;

  }


  // Active members
  const activeMembers =
    document.getElementById("activeMembers");

  if (activeMembers) {

    const activeCount =
      allData.filter(function (row) {

        const status =
          String(
            row["IsActive"] || ""
          )
            .toLowerCase()
            .trim();

        return (
          status === "yes" ||
          status === "true" ||
          status === "1" ||
          status === "active"
        );

      }).length;


    activeMembers.textContent =
      activeCount;

  }


  // Trainers
  const trainerCount =
    document.getElementById("trainerCount");

  if (trainerCount) {

    const trainers =
      new Set();


    allData.forEach(function (row) {

      if (
        row["Trainer"] &&
        String(row["Trainer"]).trim() !== ""
      ) {

        trainers.add(
          row["Trainer"]
        );

      }

    });


    trainerCount.textContent =
      trainers.size;

  }

}


// ============================================
// REFRESH BUTTON
// ============================================

function refreshLiveData() {

  console.log("Refreshing live data...");

  loadLiveData();

}


// ============================================
// SHOW ERROR
// ============================================

function showError(message) {

  const errorBox =
    document.getElementById("errorMessage");

  if (errorBox) {

    errorBox.textContent =
      message;

    errorBox.style.display =
      "block";

  } else {

    console.error(message);

  }

}


// ============================================
// AUTO REFRESH EVERY 5 MINUTES
// ============================================

setInterval(function () {

  console.log(
    "Auto-refreshing live data..."
  );

  loadLiveData();

}, 300000);
