// ============================================
// FOS PERFORMANCE PORTAL - LIVE DATA
// ============================================


const API_URL =
  "https://script.google.com/macros/s/AKfycbzU_SubIsUJaJ-ffGnp_yRc8CvEXMRZB4eccAAVa6qTmhp6RwLI8-LK-wVwwzo1gRc/exec";


let allData = [];
let headers = [];
let rawRows = [];
let filteredData = [];


// ============================================
// COLUMN NAME HELPERS
// ============================================


function normalizeText(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

}


// Find a column using multiple possible names

function findColumnIndex(possibleNames) {

  const normalizedNames =
    possibleNames.map(function (name) {

      return normalizeText(name);

    });


  return headers.findIndex(function (header) {

    const normalizedHeader =
      normalizeText(header);


    return normalizedNames.some(function (name) {

      return (
        normalizedHeader === name ||
        normalizedHeader.includes(name)
      );

    });

  });

}


// ============================================
// GET VALUE FROM ROW
// ============================================


function getValue(row, index) {

  if (
    index === -1 ||
    index === undefined
  ) {

    return "";

  }


  const key =
    headers[index] +
    "__" +
    index;


  return row[key] ?? "";

}


// ============================================
// NUMBER CONVERTER
// ============================================


function parseNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return 0;

  }


  const cleaned =
    String(value)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .replace(/[^0-9.-]/g, "");


  const number =
    parseFloat(cleaned);


  return isNaN(number)
    ? 0
    : number;

}


// ============================================
// FORMAT NUMBER
// ============================================


function formatNumber(number) {

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2
    }
  ).format(number || 0);

}


// ============================================
// FORMAT APE
// ============================================


function formatAPE(number) {

  if (!number) {
    return "0";
  }


  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 2
    }
  ).format(number);

}


// ============================================
// PAGE LOAD
// ============================================


document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "Starting FOS Performance Portal"
    );


    setupNavigation();

    setupFilters();

    loadLiveData();

  }
);


// ============================================
// LOAD LIVE DATA
// ============================================


async function loadLiveData() {


  showLoadingScreen();


  try {


    console.log(
      "Loading data from Google Sheet..."
    );


    updateConnectionStatus(
      "Loading data..."
    );


    const response =
      await fetch(
        API_URL,
        {
          cache: "no-store"
        }
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
      "Data received from Google Sheet"
    );


    if (!result.success) {

      throw new Error(
        result.error ||
        "Unable to load Google Sheet data"
      );

    }


    headers =
      result.headers || [];


    rawRows =
      result.rows || [];


    // ========================================
    // CONVERT ROWS INTO OBJECTS
    // ========================================


    allData =
      rawRows.map(
        function (row) {


          const obj = {};


          headers.forEach(
            function (
              header,
              index
            ) {


              const columnName =
                header +
                "__" +
                index;


              obj[columnName] =
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


    console.log(
      "Headers:",
      headers
    );


    // ========================================
    // UPDATE EVERYTHING
    // ========================================


    populateTrainerFilter();

    updateDashboard(
      filteredData
    );


    renderTableHeaders();

    renderTable(
      filteredData
    );


    updateLastUpdated();


    updateConnectionStatus(
      "Live • Connected"
    );


    hideLoadingScreen();


    console.log(
      "Live data loaded successfully."
    );


  } catch (error) {


    console.error(
      "Data loading error:",
      error
    );


    updateConnectionStatus(
      "Connection failed"
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
// LOADING SCREEN
// ============================================


function showLoadingScreen() {


  const loader =
    document.getElementById(
      "loadingScreen"
    );


  if (loader) {

    loader.style.display =
      "flex";

  }


}


function hideLoadingScreen() {


  const loader =
    document.getElementById(
      "loadingScreen"
    );


  if (loader) {

    loader.style.display =
      "none";

  }


}


// ============================================
// CONNECTION STATUS
// ============================================


function updateConnectionStatus(message) {


  const status =
    document.getElementById(
      "sidebarStatus"
    );


  if (status) {

    status.textContent =
      message;

  }


}


// ============================================
// UPDATE LAST UPDATED TIME
// ============================================


function updateLastUpdated() {


  const element =
    document.getElementById(
      "lastUpdated"
    );


  if (!element) {
    return;
  }


  const now =
    new Date();


  element.textContent =
    now.toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short"
      }
    );


}


// ============================================
// POPULATE TRAINER FILTER
// ============================================


function populateTrainerFilter() {


  const trainerFilter =
    document.getElementById(
      "trainerFilter"
    );


  if (!trainerFilter) {
    return;
  }


  const trainerIndex =
    findColumnIndex([
      "trainer",
      "trainername",
      "trainer name"
    ]);


  if (trainerIndex === -1) {

    console.warn(
      "Trainer column not found"
    );

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
            trainerIndex
          )
        ).trim();


      if (trainer !== "") {

        trainers.add(
          trainer
        );

      }


    }
  );


  trainerFilter.innerHTML =
    '<option value="">All Trainers</option>';


  Array.from(trainers)
    .sort()
    .forEach(
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


  trainerFilter.value =
    currentValue;


}


// ============================================
// UPDATE DASHBOARD
// ============================================


function updateDashboard(data) {


  // ----------------------------------------
  // FIND IMPORTANT COLUMNS
  // ----------------------------------------


  const isActiveIndex =
    findColumnIndex([
      "isactive",
      "active",
      "status",
      "memberstatus"
    ]);


  const trainerIndex =
    findColumnIndex([
      "trainer",
      "trainername",
      "trainer name"
    ]);


  const appointmentIndex =
    findColumnIndex([
      "appointments",
      "appointment",
      "totalappointments"
    ]);


  const visitIndex =
    findColumnIndex([
      "visits",
      "visit",
      "totalvisits"
    ]);


  const bookingIndex =
    findColumnIndex([
      "bookings",
      "booking",
      "totalbookings"
    ]);


  const apeIndex =
    findColumnIndex([
      "ape",
      "annualpremiumequivalent"
    ]);


  // ----------------------------------------
  // TOTAL MEMBERS
  // ----------------------------------------


  setElementValue(
    "totalMembers",
    formatNumber(
      data.length
    )
  );


  // ----------------------------------------
  // ACTIVE MEMBERS
  // ----------------------------------------


  let activeCount =
    0;


  if (
    isActiveIndex !== -1
  ) {


    activeCount =
      data.filter(
        function (row) {


          const value =
            String(
              getValue(
                row,
                isActiveIndex
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


  }


  setElementValue(
    "activeMembers",
    formatNumber(
      activeCount
    )
  );


  // ----------------------------------------
  // TRAINERS
  // ----------------------------------------


  const trainers =
    new Set();


  if (
    trainerIndex !== -1
  ) {


    data.forEach(
      function (row) {


        const trainer =
          String(
            getValue(
              row,
              trainerIndex
            )
          ).trim();


        if (trainer) {

          trainers.add(
            trainer
          );

        }


      }
    );


  }


  setElementValue(
    "trainerCount",
    formatNumber(
      trainers.size
    )
  );


  // ----------------------------------------
  // APPOINTMENTS
  // ----------------------------------------


  const appointments =
    sumColumn(
      data,
      appointmentIndex
    );


  setElementValue(
    "appointmentValue",
    formatNumber(
      appointments
    )
  );


  setElementValue(
    "group1Value",
    formatNumber(
      appointments
    )
  );


  // ----------------------------------------
  // VISITS
  // ----------------------------------------


  const visits =
    sumColumn(
      data,
      visitIndex
    );


  setElementValue(
    "group2Value",
    formatNumber(
      visits
    )
  );


  // ----------------------------------------
  // BOOKINGS
  // ----------------------------------------


  const bookings =
    sumColumn(
      data,
      bookingIndex
    );


  setElementValue(
    "group3Value",
    formatNumber(
      bookings
    )
  );


  // ----------------------------------------
  // APE
  // ----------------------------------------


  const ape =
    sumColumn(
      data,
      apeIndex
    );


  setElementValue(
    "apeValue",
    formatAPE(
      ape
    )
  );


  setElementValue(
    "group4Value",
    formatAPE(
      ape
    )
  );


  // ----------------------------------------
  // TRAINER LIST
  // ----------------------------------------


  renderTrainerList(
    data,
    trainerIndex
  );


}


// ============================================
// SUM COLUMN
// ============================================


function sumColumn(
  data,
  columnIndex
) {


  if (
    columnIndex === -1
  ) {

    return 0;

  }


  return data.reduce(
    function (
      total,
      row
    ) {


      return (
        total +

        parseNumber(
          getValue(
            row,
            columnIndex
          )
        )

      );


    },
    0
  );


}


// ============================================
// SET ELEMENT VALUE
// ============================================


function setElementValue(
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


// ============================================
// TRAINER LIST
// ============================================


function renderTrainerList(
  data,
  trainerIndex
) {


  const container =
    document.getElementById(
      "trainerList"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  if (
    trainerIndex === -1
  ) {


    container.innerHTML =

      '<div class="empty-state">' +

      'Trainer column was not found in the Google Sheet.' +

      '</div>';


    return;


  }


  const trainerCounts =
    {};


  data.forEach(
    function (row) {


      const trainer =
        String(
          getValue(
            row,
            trainerIndex
          )
        ).trim();


      if (!trainer) {
        return;
      }


      if (!trainerCounts[trainer]) {

        trainerCounts[trainer] =
          0;

      }


      trainerCounts[trainer]++;


    }
  );


  const trainers =
    Object.keys(
      trainerCounts
    ).sort();


  if (
    trainers.length === 0
  ) {


    container.innerHTML =

      '<div class="empty-state">' +

      'No trainers found.' +

      '</div>';


    return;


  }


  trainers.forEach(
    function (trainer) {


      const card =
        document.createElement(
          "div"
        );


      card.className =
        "trainer-card";


      const initials =
        trainer
          .split(" ")
          .map(
            function (word) {

              return word[0];

            }
          )
          .join("")
          .substring(
            0,
            2
          )
          .toUpperCase();


      card.innerHTML =

        '<div class="trainer-avatar">' +

        initials +

        '</div>' +


        '<div class="trainer-info">' +

        '<strong>' +

        escapeHTML(
          trainer
        ) +

        '</strong>' +


        '<span>' +

        formatNumber(
          trainerCounts[trainer]
        ) +

        ' records</span>' +

        '</div>';


      container.appendChild(
        card
      );


    }
  );


}


// ============================================
// TABLE HEADERS
// ============================================


function renderTableHeaders() {


  const tableHead =
    document.getElementById(
      "tableHead"
    );


  if (!tableHead) {
    return;
  }


  tableHead.innerHTML =
    "";


  headers.forEach(
    function (
      header,
      index
    ) {


      const th =
        document.createElement(
          "th"
        );


      th.textContent =
        header ||
        (
          "Column " +
          (
            index + 1
          )
        );


      tableHead.appendChild(
        th
      );


    }
  );


}


// ============================================
// RENDER TABLE
// ============================================


function renderTable(data) {


  const tableBody =
    document.getElementById(
      "tableBody"
    );


  const recordCount =
    document.getElementById(
      "recordCount"
    );


  if (
    recordCount
  ) {

    recordCount.textContent =

      formatNumber(
        data.length
      ) +

      " Records";


  }


  if (!tableBody) {
    return;
  }


  tableBody.innerHTML =
    "";


  if (
    data.length === 0
  ) {


    const tr =
      document.createElement(
        "tr"
      );


    tr.className =
      "empty-row";


    const td =
      document.createElement(
        "td"
      );


    td.colSpan =
      Math.max(
        headers.length,
        1
      );


    td.textContent =
      "No records found.";


    tr.appendChild(
      td
    );


    tableBody.appendChild(
      tr
    );


    return;


  }


  // Render all rows

  data.forEach(
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


          td.textContent =
            getValue(
              row,
              index
            );


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


// ============================================
// FILTERS
// ============================================


function setupFilters() {


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


  const tableSearchInput =
    document.getElementById(
      "tableSearchInput"
    );


  const clearFilters =
    document.getElementById(
      "clearFilters"
    );


  if (
    trainerFilter
  ) {

    trainerFilter.addEventListener(
      "change",
      applyFilters
    );

  }


  if (
    statusFilter
  ) {

    statusFilter.addEventListener(
      "change",
      applyFilters
    );

  }


  if (
    searchInput
  ) {

    searchInput.addEventListener(
      "input",
      applyFilters
    );

  }


  if (
    tableSearchInput
  ) {

    tableSearchInput.addEventListener(

      "input",

      function () {


        const searchText =
          tableSearchInput.value
            .trim()
            .toLowerCase();


        const searchedData =
          filteredData.filter(
            function (row) {


              return rowMatchesSearch(
                row,
                searchText
              );


            }
          );


        renderTable(
          searchedData
        );


      }

    );

  }


  if (
    clearFilters
  ) {


    clearFilters.addEventListener(

      "click",

      function () {


        if (trainerFilter) {

          trainerFilter.value =
            "";

        }


        if (statusFilter) {

          statusFilter.value =
            "";

        }


        if (searchInput) {

          searchInput.value =
            "";

        }


        if (tableSearchInput) {

          tableSearchInput.value =
            "";

        }


        applyFilters();


      }

    );


  }


}


// ============================================
// APPLY FILTERS
// ============================================


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


  const trainerIndex =
    findColumnIndex([
      "trainer",
      "trainername",
      "trainer name"
    ]);


  const statusIndex =
    findColumnIndex([
      "isactive",
      "active",
      "status",
      "memberstatus"
    ]);


  filteredData =
    allData.filter(
      function (row) {


        // TRAINER FILTER

        if (
          trainerValue &&
          trainerIndex !== -1
        ) {


          const trainer =
            String(
              getValue(
                row,
                trainerIndex
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

        if (
          statusValue &&
          statusIndex !== -1
        ) {


          const status =
            String(
              getValue(
                row,
                statusIndex
              )
            )
              .trim()
              .toLowerCase();


          const isActive =

            status === "yes" ||
            status === "true" ||
            status === "1" ||
            status === "active";


          if (
            statusValue === "active" &&
            !isActive
          ) {

            return false;

          }


          if (
            statusValue === "inactive" &&
            isActive
          ) {

            return false;

          }


        }


        // SEARCH

        if (
          searchValue &&
          !rowMatchesSearch(
            row,
            searchValue
          )
        ) {

          return false;

        }


        return true;


      }
    );


  updateDashboard(
    filteredData
  );


  renderTable(
    filteredData
  );


}


// ============================================
// ROW SEARCH
// ============================================


function rowMatchesSearch(
  row,
  searchText
) {


  if (!searchText) {
    return true;
  }


  return headers.some(
    function (
      header,
      index
    ) {


      const value =
        String(
          getValue(
            row,
            index
          )
        )
          .toLowerCase();


      return value.includes(
        searchText
      );


    }
  );


}


// ============================================
// NAVIGATION
// ============================================


function setupNavigation() {


  const dashboardNav =
    document.getElementById(
      "dashboardNav"
    );


  const performanceNav =
    document.getElementById(
      "performanceNav"
    );


  if (
    dashboardNav
  ) {


    dashboardNav.addEventListener(

      "click",

      function () {


        showPage(
          "dashboard"
        );


      }

    );


  }


  if (
    performanceNav
  ) {


    performanceNav.addEventListener(

      "click",

      function () {


        showPage(
          "performance"
        );


      }

    );


  }


}


// ============================================
// SHOW PAGE
// ============================================


function showPage(
  page
) {


  const dashboardPage =
    document.getElementById(
      "dashboardPage"
    );


  const performancePage =
    document.getElementById(
      "performancePage"
    );


  const dashboardNav =
    document.getElementById(
      "dashboardNav"
    );


  const performanceNav =
    document.getElementById(
      "performanceNav"
    );


  const pageTitle =
    document.getElementById(
      "pageTitle"
    );


  if (
    page === "dashboard"
  ) {


    dashboardPage.classList.add(
      "active-page"
    );


    performancePage.classList.remove(
      "active-page"
    );


    dashboardNav.classList.add(
      "active"
    );


    performanceNav.classList.remove(
      "active"
    );


    if (pageTitle) {

      pageTitle.textContent =
        "Dashboard";

    }


  }


  if (
    page === "performance"
  ) {


    performancePage.classList.add(
      "active-page"
    );


    dashboardPage.classList.remove(
      "active-page"
    );


    performanceNav.classList.add(
      "active"
    );


    dashboardNav.classList.remove(
      "active"
    );


    if (pageTitle) {

      pageTitle.textContent =
        "Performance Data";

    }


  }


}


// ============================================
// ESCAPE HTML
// ============================================


function escapeHTML(text) {


  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    text;


  return div.innerHTML;


}


// ============================================
// MANUAL REFRESH
// ============================================


function refreshLiveData() {


  console.log(
    "Manual refresh started..."
  );


  loadLiveData();


}


// ============================================
// AUTO REFRESH - EVERY 5 MINUTES
// ============================================


setInterval(
  function () {


    console.log(
      "Auto-refreshing live data..."
    );


    loadLiveData();


  },

  300000
);
