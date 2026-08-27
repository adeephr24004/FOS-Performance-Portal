// ==========================================================
// FOS PERFORMANCE PORTAL
// ERROR-TOLERANT GOOGLE SHEETS CONNECTION
// ==========================================================

const GOOGLE_SHEET_API =
  "https://script.google.com/macros/s/AKfycbx3DH5vcJaP3PjC2PwKsIA_ZwIFoF1gdJ-26gOKrjY6MLaakuyqI7dwSKC7xbNlQw/exec";

// ==========================================================
// GLOBAL DATA
// ==========================================================

let rawData = [];
let filteredData = [];
let currentEmployee = null;

let loading = false;
let lastUpdated = null;


// ==========================================================
// COLUMN ALIASES
// Automatically detects different Google Sheet column names
// ==========================================================

const FIELD_ALIASES = {

  ecode: [
    "ecode",
    "e code",
    "e-code",
    "employee code",
    "employee id",
    "emp code",
    "code"
  ],

  username: [
    "username",
    "user name",
    "user",
    "rm name",
    "name",
    "employee name",
    "rm"
  ],

  doj: [
    "doj",
    "date of joining",
    "joining date",
    "date joining"
  ],

  tl: [
    "tl",
    "team leader",
    "teamleader",
    "tl name"
  ],

  zm: [
    "zm",
    "zonal manager",
    "zone manager",
    "zm name"
  ],

  city: [
    "city",
    "location"
  ],

  zone: [
    "zone",
    "region"
  ],

  trainer: [
    "trainer",
    "trainer name",
    "training manager"
  ],

  batch: [
    "batch",
    "batch name"
  ],

  tenure: [
    "tenure",
    "experience"
  ],

  date: [
    "date",
    "report date",
    "day"
  ],

  appointment: [
    "appointment",
    "appointments",
    "appt",
    "appt count"
  ],

  visit: [
    "visit",
    "visits",
    "visit count"
  ],

  booking: [
    "booking",
    "bookings",
    "booking count"
  ],

  ape: [
    "ape",
    "total ape",
    "premium",
    "amount"
  ],

  my: [
    "my",
    "month",
    "month year"
  ]

};


// ==========================================================
// SAFE HELPERS
// ==========================================================

function normalizeKey(value) {

  try {

    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ");

  } catch (error) {

    return "";

  }

}


function safeText(value, fallback = "-") {

  try {

    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    return String(value);

  } catch (error) {

    return fallback;

  }

}


function safeNumber(value) {

  try {

    if (value === null || value === undefined || value === "") {
      return 0;
    }

    if (typeof value === "number") {
      return isFinite(value) ? value : 0;
    }

    const cleaned = String(value)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "");

    const number = Number(cleaned);

    return isFinite(number) ? number : 0;

  } catch (error) {

    return 0;

  }

}


function safeArray(value) {

  return Array.isArray(value) ? value : [];

}


// ==========================================================
// FIND FIELD FROM ROW
// ==========================================================

function getField(row, fieldName) {

  try {

    if (!row || typeof row !== "object") {
      return "";
    }

    const aliases = FIELD_ALIASES[fieldName] || [];

    const keys = Object.keys(row);

    // Exact normalized match
    for (const alias of aliases) {

      const normalizedAlias = normalizeKey(alias);

      for (const key of keys) {

        if (normalizeKey(key) === normalizedAlias) {
          return row[key];
        }

      }

    }


    // Partial match
    for (const alias of aliases) {

      const normalizedAlias = normalizeKey(alias);

      for (const key of keys) {

        const normalizedKey = normalizeKey(key);

        if (
          normalizedKey.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedKey)
        ) {

          return row[key];

        }

      }

    }


    return "";

  } catch (error) {

    return "";

  }

}


// ==========================================================
// CLEAN ONE ROW
// Website continues even if a row is bad
// ==========================================================

function cleanRow(row, index) {

  try {

    if (!row || typeof row !== "object") {
      return null;
    }

    const cleaned = {

      id: index,

      ecode: safeText(getField(row, "ecode"), ""),

      username: safeText(getField(row, "username"), ""),

      doj: safeText(getField(row, "doj"), ""),

      tl: safeText(getField(row, "tl"), ""),

      zm: safeText(getField(row, "zm"), ""),

      city: safeText(getField(row, "city"), ""),

      zone: safeText(getField(row, "zone"), ""),

      trainer: safeText(getField(row, "trainer"), ""),

      batch: safeText(getField(row, "batch"), ""),

      tenure: safeText(getField(row, "tenure"), ""),

      date: safeText(getField(row, "date"), ""),

      my: safeText(getField(row, "my"), ""),

      appointment: safeNumber(getField(row, "appointment")),

      visit: safeNumber(getField(row, "visit")),

      booking: safeNumber(getField(row, "booking")),

      ape: safeNumber(getField(row, "ape")),

      original: row

    };


    // If ecode is missing, still keep the row
    // because Google Sheet may have useful performance data

    return cleaned;

  } catch (error) {

    console.warn("Skipping bad row:", error);

    return null;

  }

}


// ==========================================================
// PARSE API RESPONSE SAFELY
// ==========================================================

function parseResponse(text) {

  try {

    if (!text) {
      return [];
    }


    // First try normal JSON
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) {
      return parsed;
    }


    // API may return { data: [...] }
    if (parsed && Array.isArray(parsed.data)) {
      return parsed.data;
    }


    // API may return { rows: [...] }
    if (parsed && Array.isArray(parsed.rows)) {
      return parsed.rows;
    }


    // API may return { result: [...] }
    if (parsed && Array.isArray(parsed.result)) {
      return parsed.result;
    }


    // If single object
    if (parsed && typeof parsed === "object") {
      return [parsed];
    }


    return [];

  } catch (error) {

    console.warn("Normal JSON parsing failed.");

  }


  // Try extracting JSON array
  try {

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");

    if (start !== -1 && end !== -1 && end > start) {

      const possibleJson = text.substring(start, end + 1);

      const parsed = JSON.parse(possibleJson);

      return Array.isArray(parsed) ? parsed : [];

    }

  } catch (error) {

    console.warn("Array extraction failed.");

  }


  return [];

}


// ==========================================================
// LOAD GOOGLE SHEETS DATA
// ==========================================================

async function loadGoogleSheetData(showLoader = true) {

  if (loading) {
    return;
  }


  loading = true;


  try {

    if (showLoader) {
      showLoadingState(true);
    }


    console.log("Connecting to Google Sheets...");


    const controller = new AbortController();


    const timeout = setTimeout(() => {

      controller.abort();

    }, 20000);


    const response = await fetch(
      GOOGLE_SHEET_API + "?t=" + Date.now(),
      {
        method: "GET",
        signal: controller.signal,
        cache: "no-store"
      }
    );


    clearTimeout(timeout);


    if (!response.ok) {

      throw new Error(
        "Google Sheets returned status: " + response.status
      );

    }


    const text = await response.text();


    console.log(
      "Google Sheet response received:",
      text.substring(0, 500)
    );


    const data = parseResponse(text);


    if (!Array.isArray(data)) {

      throw new Error("Response is not an array");

    }


    // Clean rows individually
    const cleanedData = [];


    data.forEach((row, index) => {

      try {

        const cleanedRow = cleanRow(row, index);

        if (cleanedRow) {
          cleanedData.push(cleanedRow);
        }

      } catch (rowError) {

        console.warn(
          "Error processing row " + index,
          rowError
        );

      }

    });


    // Only replace old data if new data is valid
    if (cleanedData.length > 0) {

      rawData = cleanedData;

      filteredData = [...rawData];

      lastUpdated = new Date();

      console.log(
        "Successfully loaded rows:",
        rawData.length
      );


      // Update everything safely
      safeUpdateDashboard();

      populateFilters();

      showDataStatus(
        "Loaded " + rawData.length + " records"
      );

    } else {

      console.warn(
        "No valid rows found. Keeping existing data."
      );


      // Keep website alive with existing data
      if (rawData.length === 0) {

        rawData = [];
        filteredData = [];

        safeUpdateDashboard();

      }


      showDataStatus(
        "No valid records received"
      );

    }

  } catch (error) {

    console.error(
      "Google Sheets loading error:",
      error
    );


    // IMPORTANT:
    // DO NOT BREAK THE WEBSITE

    if (!rawData || rawData.length === 0) {

      rawData = [];
      filteredData = [];

      safeUpdateDashboard();

    }


    showDataStatus(
      "Unable to refresh data. Showing available data."
    );

  } finally {

    loading = false;

    showLoadingState(false);

  }

}


// ==========================================================
// SAFE DASHBOARD UPDATE
// ==========================================================

function safeUpdateDashboard() {

  try {

    updateDashboard();

  } catch (error) {

    console.error(
      "Dashboard update error:",
      error
    );

  }


  try {

    updateEmployeeTable();

  } catch (error) {

    console.warn(
      "Employee table update error:",
      error
    );

  }


  try {

    updateCharts();

  } catch (error) {

    console.warn(
      "Chart update error:",
      error
    );

  }

}


// ==========================================================
// CALCULATE DASHBOARD
// ==========================================================

function updateDashboard() {

  try {

    const data = safeArray(filteredData);


    const uniqueEmployees = new Set(
      data
        .map(row => row.ecode)
        .filter(value => value)
    );


    const totalAppointments = data.reduce(
      (sum, row) =>
        sum + safeNumber(row.appointment),
      0
    );


    const totalVisits = data.reduce(
      (sum, row) =>
        sum + safeNumber(row.visit),
      0
    );


    const totalBookings = data.reduce(
      (sum, row) =>
        sum + safeNumber(row.booking),
      0
    );


    const totalAPE = data.reduce(
      (sum, row) =>
        sum + safeNumber(row.ape),
      0
    );


    const appointmentConversion =
      totalAppointments > 0
        ? (totalBookings / totalAppointments) * 100
        : 0;


    const visitConversion =
      totalVisits > 0
        ? (totalBookings / totalVisits) * 100
        : 0;


    // Update cards using multiple possible IDs

    setValue(
      ["activeEmployees", "activeRMs", "totalEmployees"],
      uniqueEmployees.size
    );


    setValue(
      ["totalAppointments", "appointments"],
      formatNumber(totalAppointments)
    );


    setValue(
      ["totalVisits", "visits"],
      formatNumber(totalVisits)
    );


    setValue(
      ["totalBookings", "bookings"],
      formatNumber(totalBookings)
    );


    setValue(
      ["totalAPE", "ape"],
      formatCurrency(totalAPE)
    );


    setValue(
      ["visitBooking", "visitConversion"],
      visitConversion.toFixed(1) + "%"
    );


    setValue(
      ["appointmentConversion", "appointmentConv"],
      appointmentConversion.toFixed(1) + "%"
    );


    updateLastUpdated();

  } catch (error) {

    console.error(
      "Error updating dashboard:",
      error
    );

  }

}


// ==========================================================
// SET VALUE SAFELY
// ==========================================================

function setValue(ids, value) {

  try {

    ids.forEach(id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }

    });

  } catch (error) {

    console.warn(
      "Could not update value:",
      error
    );

  }

}


// ==========================================================
// FORMATTERS
// ==========================================================

function formatNumber(number) {

  try {

    return safeNumber(number)
      .toLocaleString("en-IN");

  } catch (error) {

    return "0";

  }

}


function formatCurrency(number) {

  try {

    const value = safeNumber(number);

    if (value >= 10000000) {

      return "₹" +
        (value / 10000000)
          .toFixed(2) +
        " Cr";

    }


    if (value >= 100000) {

      return "₹" +
        (value / 100000)
          .toFixed(2) +
        " L";

    }


    return "₹" +
      value.toLocaleString("en-IN");

  } catch (error) {

    return "₹0";

  }

}


// ==========================================================
// FILTERS
// ==========================================================

function applyFilters() {

  try {

    const searchValue =
      getInputValue(
        ["searchInput", "searchRM", "searchEmployee"]
      )
      .toLowerCase();


    const zoneValue =
      getInputValue(["zoneFilter"]);


    const cityValue =
      getInputValue(["cityFilter"]);


    const tlValue =
      getInputValue(["tlFilter"]);


    const zmValue =
      getInputValue(["zmFilter"]);


    filteredData = rawData.filter(row => {

      try {

        const matchesSearch =
          !searchValue ||
          safeText(row.ecode, "")
            .toLowerCase()
            .includes(searchValue) ||

          safeText(row.username, "")
            .toLowerCase()
            .includes(searchValue);


        const matchesZone =
          !zoneValue ||
          zoneValue === "All Zones" ||
          row.zone === zoneValue;


        const matchesCity =
          !cityValue ||
          cityValue === "All Cities" ||
          row.city === cityValue;


        const matchesTL =
          !tlValue ||
          tlValue === "All TLs" ||
          row.tl === tlValue;


        const matchesZM =
          !zmValue ||
          zmValue === "All ZMs" ||
          row.zm === zmValue;


        return (
          matchesSearch &&
          matchesZone &&
          matchesCity &&
          matchesTL &&
          matchesZM
        );

      } catch (error) {

        // Bad row does not crash filtering
        return false;

      }

    });


    safeUpdateDashboard();

  } catch (error) {

    console.error(
      "Filter error:",
      error
    );

  }

}


// ==========================================================
// CLEAR FILTERS
// ==========================================================

function clearFilters() {

  try {

    const ids = [

      "searchInput",
      "searchRM",
      "searchEmployee"

    ];


    ids.forEach(id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.value = "";
      }

    });


    [
      "zoneFilter",
      "cityFilter",
      "tlFilter",
      "zmFilter"
    ].forEach(id => {

      const element =
        document.getElementById(id);

      if (element) {
        element.selectedIndex = 0;
      }

    });


    filteredData = [...rawData];

    safeUpdateDashboard();

  } catch (error) {

    console.warn(
      "Clear filter error:",
      error
    );

  }

}


// ==========================================================
// GET INPUT VALUE SAFELY
// ==========================================================

function getInputValue(ids) {

  try {

    for (const id of ids) {

      const element =
        document.getElementById(id);

      if (element && element.value !== undefined) {
        return String(element.value).trim();
      }

    }

    return "";

  } catch (error) {

    return "";

  }

}


// ==========================================================
// POPULATE DROPDOWNS
// ==========================================================

function populateFilters() {

  try {

    populateSelect(
      "zoneFilter",
      getUniqueValues("zone"),
      "All Zones"
    );


    populateSelect(
      "cityFilter",
      getUniqueValues("city"),
      "All Cities"
    );


    populateSelect(
      "tlFilter",
      getUniqueValues("tl"),
      "All TLs"
    );


    populateSelect(
      "zmFilter",
      getUniqueValues("zm"),
      "All ZMs"
    );


    populateSelect(
      "trainerFilter",
      getUniqueValues("trainer"),
      "All Trainers"
    );

  } catch (error) {

    console.warn(
      "Filter population error:",
      error
    );

  }

}


function getUniqueValues(field) {

  try {

    return [
      ...new Set(

        rawData
          .map(row =>
            safeText(row[field], "")
          )
          .filter(value => value && value !== "-")

      )

    ].sort();

  } catch (error) {

    return [];

  }

}


function populateSelect(id, values, defaultText) {

  try {

    const select =
      document.getElementById(id);


    if (!select) {
      return;
    }


    const currentValue =
      select.value;


    select.innerHTML = "";


    const defaultOption =
      document.createElement("option");

    defaultOption.value = "";

    defaultOption.textContent =
      defaultText;


    select.appendChild(defaultOption);


    values.forEach(value => {

      const option =
        document.createElement("option");

      option.value = value;

      option.textContent = value;

      select.appendChild(option);

    });


    // Restore previous selection if possible

    if (
      currentValue &&
      values.includes(currentValue)
    ) {

      select.value = currentValue;

    }

  } catch (error) {

    console.warn(
      "Could not populate " + id,
      error
    );

  }

}


// ==========================================================
// EMPLOYEE TABLE
// ==========================================================

function updateEmployeeTable() {

  try {

    const tableBody =
      document.querySelector(
        "#employeeTableBody"
      );


    if (!tableBody) {
      return;
    }


    tableBody.innerHTML = "";


    if (filteredData.length === 0) {

      tableBody.innerHTML = `
        <tr>
          <td colspan="15">
            No data available
          </td>
        </tr>
      `;

      return;

    }


    filteredData.forEach(row => {

      try {

        const visitPercent =
          row.appointment > 0
            ? (
                row.visit /
                row.appointment *
                100
              ).toFixed(1)
            : "0.0";


        const appointmentConversion =
          row.appointment > 0
            ? (
                row.booking /
                row.appointment *
                100
              ).toFixed(1)
            : "0.0";


        const visitConversion =
          row.visit > 0
            ? (
                row.booking /
                row.visit *
                100
              ).toFixed(1)
            : "0.0";


        const tr =
          document.createElement("tr");


        tr.innerHTML = `

          <td>${safeText(row.ecode)}</td>

          <td>${safeText(row.username)}</td>

          <td>${safeText(row.doj)}</td>

          <td>${safeText(row.tenure)}</td>

          <td>${safeText(row.tl)}</td>

          <td>${safeText(row.zm)}</td>

          <td>${safeText(row.city)}</td>

          <td>${safeText(row.zone)}</td>

          <td>${safeText(row.trainer)}</td>

          <td>${safeText(row.my)}</td>

          <td>${formatNumber(row.appointment)}</td>

          <td>${formatNumber(row.visit)}</td>

          <td>${formatNumber(row.booking)}</td>

          <td>${formatCurrency(row.ape)}</td>

          <td>${visitPercent}%</td>

          <td>${appointmentConversion}%</td>

          <td>${visitConversion}%</td>

        `;


        tableBody.appendChild(tr);

      } catch (rowError) {

        console.warn(
          "Table row error:",
          rowError
        );

      }

    });

  } catch (error) {

    console.warn(
      "Employee table error:",
      error
    );

  }

}


// ==========================================================
// CHARTS
// ==========================================================

function updateCharts() {

  try {

    // Charts can be added here.
    // This function intentionally does nothing
    // if Chart.js or chart elements are missing.

    if (typeof Chart === "undefined") {

      console.log(
        "Chart.js not available. Skipping charts."
      );

      return;

    }

  } catch (error) {

    console.warn(
      "Chart error:",
      error
    );

  }

}


// ==========================================================
// LOADING STATE
// ==========================================================

function showLoadingState(isLoading) {

  try {

    const loader =
      document.getElementById("loadingOverlay");


    if (loader) {

      loader.style.display =
        isLoading ? "flex" : "none";

    }


    const refreshButtons =
      document.querySelectorAll(
        ".refresh-btn, #refreshBtn"
      );


    refreshButtons.forEach(button => {

      button.disabled = isLoading;

    });

  } catch (error) {

    console.warn(
      "Loading state error:",
      error
    );

  }

}


// ==========================================================
// DATA STATUS
// ==========================================================

function showDataStatus(message) {

  try {

    const element =
      document.getElementById(
        "dataStatus"
      );


    if (element) {
      element.textContent = message;
    }

  } catch (error) {

    // Do nothing
  }

}


// ==========================================================
// LAST UPDATED
// ==========================================================

function updateLastUpdated() {

  try {

    const element =
      document.getElementById(
        "lastUpdated"
      );


    if (!element) {
      return;
    }


    if (!lastUpdated) {

      element.textContent =
        "Last updated --";

      return;

    }


    element.textContent =
      "Last updated " +
      lastUpdated.toLocaleTimeString();

  } catch (error) {

    // Do nothing

  }

}


// ==========================================================
// EVENT LISTENERS
// ==========================================================

function initializeEvents() {

  try {

    const searchInputs = [

      "searchInput",
      "searchRM",
      "searchEmployee"

    ];


    searchInputs.forEach(id => {

      const element =
        document.getElementById(id);


      if (element) {

        element.addEventListener(
          "input",
          debounce(applyFilters, 300)
        );

      }

    });


    [
      "zoneFilter",
      "cityFilter",
      "tlFilter",
      "zmFilter",
      "trainerFilter"
    ].forEach(id => {

      const element =
        document.getElementById(id);


      if (element) {

        element.addEventListener(
          "change",
          applyFilters
        );

      }

    });


    const refreshButton =
      document.getElementById(
        "refreshBtn"
      );


    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        () => {

          loadGoogleSheetData(true);

        }
      );

    }


    const clearButton =
      document.getElementById(
        "clearFiltersBtn"
      );


    if (clearButton) {

      clearButton.addEventListener(
        "click",
        clearFilters
      );

    }

  } catch (error) {

    console.warn(
      "Event initialization error:",
      error
    );

  }

}


// ==========================================================
// DEBOUNCE
// ==========================================================

function debounce(func, delay) {

  let timer;


  return function () {

    try {

      clearTimeout(timer);


      timer =
        setTimeout(() => {

          try {

            func();

          } catch (error) {

            console.warn(
              "Debounced function error:",
              error
            );

          }

        }, delay);

    } catch (error) {

      // Do nothing

    }

  };

}


// ==========================================================
// START WEBSITE
// ==========================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    try {

      console.log(
        "FOS Performance Portal starting..."
      );


      initializeEvents();


      // Website loads immediately.
      // Google Sheet loads in background.

      safeUpdateDashboard();


      setTimeout(() => {

        loadGoogleSheetData(true);

      }, 50);

    } catch (error) {

      console.error(
        "Startup error:",
        error
      );


      // WEBSITE SHOULD STILL REMAIN VISIBLE

    }

  }
);


// ==========================================================
// GLOBAL FUNCTIONS
// For HTML buttons
// ==========================================================

window.refreshData = function () {

  try {

    loadGoogleSheetData(true);

  } catch (error) {

    console.error(error);

  }

};


window.applyFilters = applyFilters;

window.clearFilters = clearFilters;


// ==========================================================
// FINAL SAFETY NET
// ==========================================================

window.addEventListener(
  "error",
  function (event) {

    console.warn(
      "Website caught an error:",
      event.message
    );

    // Prevent one JavaScript error
    // from completely stopping future code

  }
);


window.addEventListener(
  "unhandledrejection",
  function (event) {

    console.warn(
      "Unhandled promise error:",
      event.reason
    );

  }
);
