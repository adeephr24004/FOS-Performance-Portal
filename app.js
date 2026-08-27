// ============================================
// FOS PERFORMANCE PORTAL - LIVE DATA
// ============================================

const API_URL =
  "https://script.google.com/macros/s/AKfycbzU_SubIsUJaJ-ffGnp_yRc8CvEXMRZB4eccAAVa6qTmhp6RwLI8-LK-wVwwzo1gRc/exec";

let allData = [];
let headers = [];


document.addEventListener("DOMContentLoaded", function () {
  console.log("Starting FOS Performance Portal");
  loadLiveData();
});


// ============================================
// LOAD LIVE DATA
// ============================================

async function loadLiveData() {

  try {

    console.log("Loading data from Google Sheet...");

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Server error: " + response.status);
    }

    const result = await response.json();

    console.log("Data received from Google Sheet");

    if (!result.success) {
      throw new Error(
        result.error || "Unable to load Google Sheet data"
      );
    }


    headers = result.headers || [];
    const rows = result.rows || [];


    // Convert rows into objects
    allData = rows.map(function (row) {

      const obj = {};

      headers.forEach(function (header, index) {

        // Keep duplicate headers separate internally
        const columnName =
          header + "__" + index;

        obj[columnName] =
          row[index] ?? "";

      });

      return obj;

    });


    console.log(
      "Total records loaded:",
      allData.length
    );


    hideLoadingScreen();

    displayData(rows);


  } catch (error) {

    console.error(
      "Data loading error:",
      error
    );

    hideLoadingScreen();

    alert(
      "Unable to load live data.\n\n" +
      error.message +
      "\n\nPlease check your Google Apps Script deployment."
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

function displayData(rows) {

  console.log("Displaying live data...");


  const tableBody =
    document.getElementById("tableBody");


  // If your existing website doesn't have tableBody,
  // data is still successfully loaded.
  if (!tableBody) {

    console.log(
      "Live data loaded successfully."
    );

    return;

  }


  tableBody.innerHTML = "";


  rows.forEach(function (row) {

    const tr =
      document.createElement("tr");


    row.forEach(function (cell) {

      const td =
        document.createElement("td");

      td.textContent =
        cell ?? "";

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

  // Find exact IsActive column
  const isActiveIndex =
    headers.findIndex(function (header) {

      return String(header)
        .trim()
        .toLowerCase() === "isactive";

    });


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

  if (
    activeMembers &&
    isActiveIndex !== -1
  ) {

    const activeCount =
      allData.filter(function (row) {

        const key =
          headers[isActiveIndex] +
          "__" +
          isActiveIndex;

        const value =
          String(row[key] || "")
            .trim()
            .toLowerCase();

        return (
          value === "yes" ||
          value === "true" ||
          value === "1" ||
          value === "active"
        );

      }).length;


    activeMembers.textContent =
      activeCount;

  }


  // Find Trainer column
  const trainerIndex =
    headers.findIndex(function (header) {

      return String(header)
        .trim()
        .toLowerCase() === "trainer";

    });


  // Trainer count
  const trainerCount =
    document.getElementById("trainerCount");

  if (
    trainerCount &&
    trainerIndex !== -1
  ) {

    const trainers =
      new Set();


    allData.forEach(function (row) {

      const key =
        headers[trainerIndex] +
        "__" +
        trainerIndex;

      const trainer =
        String(row[key] || "").trim();


      if (trainer !== "") {
        trainers.add(trainer);
      }

    });


    trainerCount.textContent =
      trainers.size;

  }

}


// ============================================
// MANUAL REFRESH
// ============================================

function refreshLiveData() {

  loadLiveData();

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
