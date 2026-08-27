// =========================================================
// FOS PERFORMANCE PORTAL
// LIVE GOOGLE SHEET CONNECTION
// =========================================================


// YOUR GOOGLE APPS SCRIPT API

const API_URL =
  "https://script.google.com/macros/s/AKfycbzU_SubIsUJaJ-ffGnp_yRc8CvEXMRZB4eccAAVa6qTmhp6RwLI8-LK-wVwwzo1gRc/exec";


// =========================================================
// GLOBAL DATA
// =========================================================

let headers = [];
let rawRows = [];
let allData = [];
let filteredData = [];


// =========================================================
// START WEBSITE
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "Starting FOS Performance Portal..."
    );


    setupEventListeners();


    loadLiveData();

  }
);


// =========================================================
// LOAD LIVE DATA
// =========================================================

async function loadLiveData() {

  showLoading();


  try {

    console.log(
      "Loading live data from Google Sheet..."
    );


    const response =
      await fetch(
        API_URL +
        "?t=" +
        new Date().getTime()
      );


    if (!response.ok) {

      throw new Error(
        "Server error: " +
        response.status
      );

    }


    const result =
      await response.json();


    console.log(
      "Google Sheet response:",
      result
    );


    // CHECK API RESPONSE

    if (!result.success) {

      throw new Error(
        result.error ||
        "Unable to load Google Sheet data"
      );

    }


    // GET HEADERS AND ROWS

    headers =
      result.headers || [];


    rawRows =
      result.rows || [];


    // CONVERT INTO OBJECTS

    allData =
      rawRows.map(
        function (row) {

          const obj = {};


          headers.forEach(
            function (
              header,
              index
            ) {

              const uniqueKey =
                header +
                "__" +
                index;


              obj[uniqueKey] =
                row[index] ?? "";

            }
          );


          return obj;

        }
      );


    filteredData =
      [...allData];


    console.log(
      "Total records loaded:",
      allData.length
    );


    // UPDATE EVERYTHING

    populateTrainerFilter();


    applyFilters();


    updateLastUpdated();


    updateConnectionStatus(
      "Live"
    );


    hideLoading();


  } catch (error) {

    console.error(
      "Data loading error:",
      error
    );


    updateConnectionStatus(
      "Connection Error"
    );


    hideLoading();


    alert(

      "Unable to load live data.\n\n" +

      error.message +

      "\n\nPlease check your Google Apps Script deployment."

    );

  }

}


// =========================================================
// FIND COLUMN
// =========================================================

function findColumnIndex(names) {

  return headers.findIndex(
    function (header) {

      const cleanHeader =
        String(header)
          .trim()
          .toLowerCase();


      return names.some(
        function (name) {

          return (
            cleanHeader ===
            name.toLowerCase()
          );

        }
      );

    }
  );

}


// =========================================================
// GET CELL VALUE
// =========================================================

function getValue(
  dataObject,
  columnNames
) {

  const index =
    findColumnIndex(
      columnNames
    );


  if (index === -1) {

    return "";

  }


  const key =
    headers[index] +
    "__" +
    index;


  return (
    dataObject[key] ??
    ""
  );

}


// =========================================================
// NUMBER CONVERTER
// =========================================================

function toNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return 0;

  }


  const cleaned =
    String(value)
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "");


  const number =
    Number(cleaned);


  return isNaN(number)
    ? 0
    : number;

}


// =========================================================
// FORMAT NUMBER
// =========================================================

function formatNumber(number) {

  return Number(number)
    .toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2
      }
    );

}


// =========================================================
// APPLY FILTERS
// =========================================================

function applyFilters() {

  const trainerFilter =
    document.getElementById(
      "trainerFilter"
    );


  const statusFilter =
    document.getElementById(
      "statusFilter"
    );


  const searchInput =
    document.getElementById(
      "searchInput"
    );


  const trainerValue =
    trainerFilter
      ? trainerFilter.value
      : "";


  const statusValue =
    statusFilter
      ? statusFilter.value
      : "";


  const searchValue =
    searchInput
      ? searchInput.value
          .trim()
          .toLowerCase()
      : "";


  filteredData =
    allData.filter(
      function (row) {


        // TRAINER FILTER

        if (trainerValue) {

          const trainer =
            String(
              getValue(
                row,
                ["Trainer"]
              )
            ).trim();


          if (
            trainer !==
            trainerValue
          ) {

            return false;

          }

        }


        // STATUS FILTER

        if (statusValue) {

          const activeValue =
            String(
              getValue(
                row,
                [
                  "IsActive",
                  "Is Active"
                ]
              )
            )
              .trim()
              .toLowerCase();


          const isActive =
            activeValue === "yes" ||
            activeValue === "true" ||
            activeValue === "1" ||
            activeValue === "active";


          if (
            statusValue ===
            "active" &&
            !isActive
          ) {

            return false;

          }


          if (
            statusValue ===
            "inactive" &&
            isActive
          ) {

            return false;

          }

        }


        // SEARCH ALL COLUMNS

        if (searchValue) {

          const rowText =
            Object.values(row)
              .join(" ")
              .toLowerCase();


          if (
            !rowText.includes(
              searchValue
            )
          ) {

            return false;

          }

        }


        return true;

      }
    );


  updateDashboard();


  renderTable();


  updateRecordCount();

}


// =========================================================
// UPDATE DASHBOARD
// =========================================================

function updateDashboard() {


  // TOTAL MEMBERS

  setText(
    "totalMembers",
    filteredData.length
  );


  // ACTIVE MEMBERS

  const activeCount =
    filteredData.filter(
      function (row) {

        const value =
          String(
            getValue(
              row,
              [
                "IsActive",
                "Is Active"
              ]
            )
          )
            .trim()
            .toLowerCase();


        return (

          value === "yes" ||

          value === "true" ||

          value === "1" ||

          value === "active"

        );

      }
    ).length;


  setText(
    "activeMembers",
    activeCount
  );


  // TRAINERS

  const trainers =
    new Set();


  filteredData.forEach(
    function (row) {

      const trainer =
        String(
          getValue(
            row,
            ["Trainer"]
          )
        ).trim();


      if (trainer) {

        trainers.add(
          trainer
        );

      }

    }
  );


  setText(
    "trainerCount",
    trainers.size
  );


  // APPOINTMENTS

  const appointmentTotal =
    sumColumns(
      filteredData,
      [
        "Appoint",
        "Appointment",
        "Appointments"
      ]
    );


  setText(
    "appointmentValue",
    formatNumber(
      appointmentTotal
    )
  );


  // VISITS

  const visitTotal =
    sumColumns(
      filteredData,
      [
        "Visits",
        "Visit"
      ]
    );


  // BOOKINGS

  const bookingTotal =
    sumColumns(
      filteredData,
      [
        "Bookings",
        "Booking"
      ]
    );


  // APE

  const apeTotal =
    sumColumns(
      filteredData,
      [
        "APE"
      ]
    );


  // GROUP 1

  setText(
    "group1Value",
    formatNumber(
      appointmentTotal
    )
  );


  // GROUP 2

  setText(
    "group2Value",
    formatNumber(
      visitTotal
    )
  );


  // GROUP 3

  setText(
    "group3Value",
    formatNumber(
      bookingTotal
    )
  );


  // GROUP 4

  setText(
    "group4Value",
    formatNumber(
      apeTotal
    )
  );


  // MAIN APE

  setText(
    "apeValue",
    formatNumber(
      apeTotal
    )
  );


  // TRAINER LIST

  renderTrainerList(
    trainers
  );

}


// =========================================================
// SUM COLUMNS
// =========================================================

function sumColumns(
  data,
  possibleNames
) {

  return data.reduce(
    function (
      total,
      row
    ) {

      return (

        total +

        toNumber(

          getValue(
            row,
            possibleNames
          )

        )

      );

    },
    0
  );

}


// =========================================================
// SET TEXT
// =========================================================

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value;

  }

}


// =========================================================
// POPULATE TRAINER FILTER
// =========================================================

function populateTrainerFilter() {

  const trainerFilter =
    document.getElementById(
      "trainerFilter"
    );


  if (!trainerFilter) {

    return;

  }


  const currentValue =
    trainerFilter.value;


  const trainers =
    new Set();


  allData.forEach(
    function (row) {

      const trainer =
        String(
          getValue(
            row,
            ["Trainer"]
          )
        ).trim();


      if (trainer) {

        trainers.add(
          trainer
        );

      }

    }
  );


  const sortedTrainers =
    Array.from(
      trainers
    ).sort();


  trainerFilter.innerHTML =
    '<option value="">All Trainers</option>';


  sortedTrainers.forEach(
    function (trainer) {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        trainer;


      option.textContent =
        trainer;


      trainerFilter.appendChild(
        option
      );

    }
  );


  if (
    sortedTrainers.includes(
      currentValue
    )
  ) {

    trainerFilter.value =
      currentValue;

  }

}


// =========================================================
// RENDER TRAINER LIST
// =========================================================

function renderTrainerList(
  trainers
) {

  const trainerList =
    document.getElementById(
      "trainerList"
    );


  if (!trainerList) {

    return;

  }


  trainerList.innerHTML =
    "";


  const trainerArray =
    Array.from(
      trainers
    ).sort();


  if (
    trainerArray.length === 0
  ) {

    trainerList.innerHTML =
      "<p>No trainers found.</p>";

    return;

  }


  trainerArray.forEach(
    function (trainer) {

      const chip =
        document.createElement(
          "div"
        );


      chip.className =
        "trainer-chip";


      chip.textContent =
        trainer;


      trainerList.appendChild(
        chip
      );

    }
  );

}


// =========================================================
// RENDER TABLE
// =========================================================

function renderTable() {


  const tableHead =
    document.getElementById(
      "tableHead"
    );


  const tableBody =
    document.getElementById(
      "tableBody"
    );


  if (
    !tableHead ||
    !tableBody
  ) {

    return;

  }


  // CLEAR

  tableHead.innerHTML =
    "";


  tableBody.innerHTML =
    "";


  // HEADERS

  headers.forEach(
    function (header) {

      const th =
        document.createElement(
          "th"
        );


      th.textContent =
        header;


      tableHead.appendChild(
        th
      );

    }
  );


  // ROWS

  if (
    filteredData.length === 0
  ) {

    const tr =
      document.createElement(
        "tr"
      );


    const td =
      document.createElement(
        "td"
      );


    td.colSpan =
      headers.length;


    td.textContent =
      "No records found.";


    td.style.textAlign =
      "center";


    tr.appendChild(
      td
    );


    tableBody.appendChild(
      tr
    );


    return;

  }


  filteredData.forEach(
    function (row) {

      const tr =
        document.createElement(
          "tr"
        );


      headers.forEach(
        function (
          header,
          index
        ) {

          const td =
            document.createElement(
              "td"
            );


          const key =
            header +
            "__" +
            index;


          td.textContent =
            row[key] ?? "";


          tr.appendChild(
            td
          );

        }
      );


      tableBody.appendChild(
        tr
      );

    }
  );

}


// =========================================================
// RECORD COUNT
// =========================================================

function updateRecordCount() {

  setText(

    "recordCount",

    filteredData.length +
    " Records"

  );

}


// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {


  // TRAINER FILTER

  const trainerFilter =
    document.getElementById(
      "trainerFilter"
    );


  if (trainerFilter) {

    trainerFilter.addEventListener(
      "change",
      applyFilters
    );

  }


  // STATUS FILTER

  const statusFilter =
    document.getElementById(
      "statusFilter"
    );


  if (statusFilter) {

    statusFilter.addEventListener(
      "change",
      applyFilters
    );

  }


  // MAIN SEARCH

  const searchInput =
    document.getElementById(
      "searchInput"
    );


  if (searchInput) {

    searchInput.addEventListener(
      "input",
      applyFilters
    );

  }


  // TABLE SEARCH

  const tableSearchInput =
    document.getElementById(
      "tableSearchInput"
    );


  if (tableSearchInput) {

    tableSearchInput.addEventListener(
      "input",
      function () {


        const searchValue =
          this.value
            .toLowerCase()
            .trim();


        if (
          !searchValue
        ) {

          applyFilters();

          return;

        }


        filteredData =
          allData.filter(
            function (row) {

              return Object
                .values(row)
                .join(" ")
                .toLowerCase()
                .includes(
                  searchValue
                );

            }
          );


        renderTable();


        updateRecordCount();

      }
    );

  }


  // CLEAR FILTERS

  const clearFilters =
    document.getElementById(
      "clearFilters"
    );


  if (clearFilters) {

    clearFilters.addEventListener(
      "click",
      function () {


        document.getElementById(
          "trainerFilter"
        ).value = "";


        document.getElementById(
          "statusFilter"
        ).value = "";


        document.getElementById(
          "searchInput"
        ).value = "";


        const tableSearch =
          document.getElementById(
            "tableSearchInput"
          );


        if (tableSearch) {

          tableSearch.value =
            "";

        }


        applyFilters();

      }
    );

  }


  // PERFORMANCE NAVIGATION

  const performanceNav =
    document.getElementById(
      "performanceNav"
    );


  if (performanceNav) {

    performanceNav.addEventListener(
      "click",
      function () {


        document
          .getElementById(
            "dashboardPage"
          )
          .classList.remove(
            "active-page"
          );


        document
          .getElementById(
            "performancePage"
          )
          .classList.add(
            "active-page"
          );


        renderTable();

      }
    );

  }

}


// =========================================================
// REFRESH DATA
// =========================================================

function refreshLiveData() {

  console.log(
    "Manual refresh requested..."
  );


  loadLiveData();

}


// =========================================================
// LAST UPDATED
// =========================================================

function updateLastUpdated() {

  const now =
    new Date();


  const time =
    now.toLocaleString(
      "en-IN"
    );


  setText(
    "lastUpdated",
    time
  );

}


// =========================================================
// CONNECTION STATUS
// =========================================================

function updateConnectionStatus(
  status
) {

  setText(
    "sidebarStatus",
    status
  );

}


// =========================================================
// LOADING SCREEN
// =========================================================

function showLoading() {

  const loader =
    document.getElementById(
      "loadingScreen"
    );


  if (loader) {

    loader.style.display =
      "flex";

  }

}


function hideLoading() {

  const loader =
    document.getElementById(
      "loadingScreen"
    );


  if (loader) {

    loader.style.display =
      "none";

  }

}


// =========================================================
// AUTO REFRESH
// EVERY 5 MINUTES
// =========================================================

setInterval(
  function () {

    console.log(
      "Auto refreshing live data..."
    );


    loadLiveData();

  },
  300000
);
