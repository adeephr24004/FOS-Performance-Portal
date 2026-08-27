// ==========================================================
// FOS PERFORMANCE PORTAL
// FAST GOOGLE SHEETS CONNECTION + LOCAL CACHE
// ==========================================================

// YOUR GOOGLE APPS SCRIPT WEB APP URL
const GOOGLE_SHEET_API =
  "https://script.google.com/macros/s/AKfycbx3DH5vcJaP3PjC2PwKsIA_ZwIFoF1gdJ-26gOKrjY6MLaakuyqI7dwSKC7xbNlQw/exec";

// Cache settings
const CACHE_KEY = "fos_performance_portal_data_v1";
const CACHE_TIME_KEY = "fos_performance_portal_time_v1";
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

let rawData = [];
let filteredData = [];
let currentEmployee = null;
let lastUpdated = null;


// ==========================================================
// COLUMN NAME ALIASES
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
    "login id",
    "login"
  ],

  name: [
    "name",
    "rm name",
    "employee name",
    "fos name",
    "advisor name",
    "full name"
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
    "teamlead",
    "team lead"
  ],

  zm: [
    "zm",
    "zonal manager",
    "zone manager"
  ],

  city: [
    "city",
    "location",
    "branch city"
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

  date: [
    "date",
    "report date",
    "activity date",
    "business date"
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
    "v"
  ],

  booking: [
    "booking",
    "bookings",
    "book"
  ],

  ape: [
    "ape",
    "annual premium equivalent",
    "premium"
  ],

  month: [
    "month",
    "my",
    "month year"
  ]

};


// ==========================================================
// START APPLICATION
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

  // 1. Load cached data immediately
  loadCachedData();

  // 2. Connect buttons and filters
  setupEvents();

  // 3. Fetch latest data silently
  fetchLatestData(false);

});


// ==========================================================
// LOCAL CACHE
// ==========================================================

function loadCachedData() {

  try {

    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME_KEY);

    if (cached) {

      rawData = JSON.parse(cached);
      lastUpdated = cachedTime ? new Date(cachedTime) : null;

      console.log("Loaded cached data:", rawData.length);

      prepareAndRenderData();

      updateLastUpdated();

    }

  } catch (error) {

    console.error("Cache loading error:", error);

  }

}


function saveDataToCache(data) {

  try {

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, new Date().toISOString());

  } catch (error) {

    console.error("Cache saving error:", error);

  }

}


function clearDataCache() {

  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIME_KEY);

}


// ==========================================================
// FETCH GOOGLE SHEET DATA
// ==========================================================

async function fetchLatestData(showLoader = false) {

  if (showLoader && rawData.length === 0) {
    showLoadingState();
  }

  try {

    console.log("Fetching latest Google Sheet data...");

    const response = await fetch(
      GOOGLE_SHEET_API +
      (GOOGLE_SHEET_API.includes("?") ? "&" : "?") +
      "t=" + Date.now(),
      {
        method: "GET",
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error("Unable to fetch Google Sheet data");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Google Sheet response is not an array");
    }

    console.log("Latest data received:", data.length);

    rawData = data;

    lastUpdated = new Date();

    saveDataToCache(rawData);

    prepareAndRenderData();

    updateLastUpdated();

    hideLoadingState();

  } catch (error) {

    console.error("Google Sheet connection error:", error);

    // If cached data exists, keep using it
    if (rawData.length > 0) {

      console.log("Using cached data because live data failed.");

      hideLoadingState();

    } else {

      showErrorState(
        "Unable to connect to Google Sheets. Please check your internet connection or Apps Script deployment."
      );

    }

  }

}


// ==========================================================
// PREPARE DATA
// ==========================================================

function prepareAndRenderData() {

  if (!Array.isArray(rawData)) {
    rawData = [];
  }

  filteredData = [...rawData];

  populateAllFilters();

  applyFilters();

}


// ==========================================================
// GET FIELD VALUE
// ==========================================================

function normalizeText(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

}


function getField(row, fieldName) {

  if (!row || typeof row !== "object") {
    return "";
  }

  const aliases = FIELD_ALIASES[fieldName] || [];

  const rowKeys = Object.keys(row);

  for (const alias of aliases) {

    const foundKey = rowKeys.find(
      key => normalizeText(key) === normalizeText(alias)
    );

    if (foundKey !== undefined) {
      return row[foundKey];
    }

  }

  return "";

}


// ==========================================================
// NUMBER HELPERS
// ==========================================================

function toNumber(value) {

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);

  return isNaN(number) ? 0 : number;

}


function sumField(data, field) {

  return data.reduce((total, row) => {

    return total + toNumber(getField(row, field));

  }, 0);

}


// ==========================================================
// DATE HELPERS
// ==========================================================

function parseDate(value) {

  if (!value) return null;

  if (value instanceof Date && !isNaN(value)) {
    return value;
  }

  const date = new Date(value);

  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;

}


function formatDate(value) {

  const date = parseDate(value);

  if (!date) return value || "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

}


function calculateTenure(doj) {

  const joiningDate = parseDate(doj);

  if (!joiningDate) return "-";

  const today = new Date();

  let months =
    (today.getFullYear() - joiningDate.getFullYear()) * 12;

  months += today.getMonth() - joiningDate.getMonth();

  if (months < 0) months = 0;

  const years = Math.floor(months / 12);

  const remainingMonths = months % 12;

  if (years === 0) {
    return `${remainingMonths} Months`;
  }

  if (remainingMonths === 0) {
    return `${years} Years`;
  }

  return `${years}Y ${remainingMonths}M`;

}


// ==========================================================
// SETUP EVENTS
// ==========================================================

function setupEvents() {

  // Search input
  const searchInput = findElement([
    "searchRM",
    "searchInput",
    "rmSearch",
    "employeeSearch",
    "search"
  ]);

  if (searchInput) {

    searchInput.addEventListener("input", () => {
      applyFilters();
    });

  }


  // Date filters
  const dateFrom = findElement([
    "dateFrom",
    "fromDate",
    "startDate"
  ]);

  const dateTo = findElement([
    "dateTo",
    "toDate",
    "endDate"
  ]);

  if (dateFrom) {
    dateFrom.addEventListener("change", applyFilters);
  }

  if (dateTo) {
    dateTo.addEventListener("change", applyFilters);
  }


  // Dropdown filters
  const filterIds = [
    "zoneFilter",
    "cityFilter",
    "zmFilter",
    "tlFilter",
    "trainerFilter"
  ];

  filterIds.forEach(id => {

    const element = document.getElementById(id);

    if (element) {

      element.addEventListener("change", () => {
        applyFilters();
      });

    }

  });


  // Refresh button
  const refreshButton = findElement([
    "refreshBtn",
    "refreshButton"
  ]);

  if (refreshButton) {

    refreshButton.addEventListener("click", () => {
      refreshData();
    });

  }


  // Clear filters button
  const clearButton = findElement([
    "clearFilters",
    "clearFilterBtn"
  ]);

  if (clearButton) {

    clearButton.addEventListener("click", clearFilters);

  }

}


// ==========================================================
// FIND ELEMENT SAFELY
// ==========================================================

function findElement(ids) {

  for (const id of ids) {

    const element = document.getElementById(id);

    if (element) return element;

  }

  return null;

}


// ==========================================================
// POPULATE FILTERS
// ==========================================================

function populateAllFilters() {

  populateSelect("zoneFilter", getUniqueValues("zone"), "All Zones");

  populateSelect("cityFilter", getUniqueValues("city"), "All Cities");

  populateSelect("zmFilter", getUniqueValues("zm"), "All ZMs");

  populateSelect("tlFilter", getUniqueValues("tl"), "All TLs");

  populateSelect(
    "trainerFilter",
    getUniqueValues("trainer"),
    "All Trainers"
  );

}


function getUniqueValues(field) {

  const values = rawData
    .map(row => getField(row, field))
    .filter(value =>
      value !== "" &&
      value !== null &&
      value !== undefined
    )
    .map(value => String(value).trim());

  return [...new Set(values)].sort((a, b) =>
    a.localeCompare(b)
  );

}


function populateSelect(id, values, defaultText) {

  const select = document.getElementById(id);

  if (!select) return;

  const currentValue = select.value;

  select.innerHTML = "";

  const defaultOption = document.createElement("option");

  defaultOption.value = "";
  defaultOption.textContent = defaultText;

  select.appendChild(defaultOption);

  values.forEach(value => {

    const option = document.createElement("option");

    option.value = value;
    option.textContent = value;

    select.appendChild(option);

  });

  if (currentValue) {
    select.value = currentValue;
  }

}


// ==========================================================
// APPLY FILTERS
// ==========================================================

function applyFilters() {

  const searchInput = findElement([
    "searchRM",
    "searchInput",
    "rmSearch",
    "employeeSearch",
    "search"
  ]);

  const searchValue = searchInput
    ? normalizeText(searchInput.value)
    : "";


  const zoneValue = getSelectValue("zoneFilter");

  const cityValue = getSelectValue("cityFilter");

  const zmValue = getSelectValue("zmFilter");

  const tlValue = getSelectValue("tlFilter");

  const trainerValue = getSelectValue("trainerFilter");


  const dateFromElement = findElement([
    "dateFrom",
    "fromDate",
    "startDate"
  ]);

  const dateToElement = findElement([
    "dateTo",
    "toDate",
    "endDate"
  ]);


  const dateFrom = dateFromElement?.value
    ? new Date(dateFromElement.value)
    : null;

  const dateTo = dateToElement?.value
    ? new Date(dateToElement.value)
    : null;


  if (dateTo) {
    dateTo.setHours(23, 59, 59, 999);
  }


  filteredData = rawData.filter(row => {

    // SEARCH
    if (searchValue) {

      const searchableText = [

        getField(row, "ecode"),
        getField(row, "username"),
        getField(row, "name")

      ]
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(searchValue)) {
        return false;
      }

    }


    // ZONE
    if (
      zoneValue &&
      String(getField(row, "zone")) !== zoneValue
    ) {
      return false;
    }


    // CITY
    if (
      cityValue &&
      String(getField(row, "city")) !== cityValue
    ) {
      return false;
    }


    // ZM
    if (
      zmValue &&
      String(getField(row, "zm")) !== zmValue
    ) {
      return false;
    }


    // TL
    if (
      tlValue &&
      String(getField(row, "tl")) !== tlValue
    ) {
      return false;
    }


    // TRAINER
    if (
      trainerValue &&
      String(getField(row, "trainer")) !== trainerValue
    ) {
      return false;
    }


    // DATE
    const rowDate = parseDate(getField(row, "date"));

    if (dateFrom && rowDate && rowDate < dateFrom) {
      return false;
    }

    if (dateTo && rowDate && rowDate > dateTo) {
      return false;
    }


    return true;

  });


  currentEmployee = null;

  updateDashboard();

}


function getSelectValue(id) {

  const element = document.getElementById(id);

  return element ? element.value : "";

}


// ==========================================================
// CLEAR FILTERS
// ==========================================================

function clearFilters() {

  const searchInput = findElement([
    "searchRM",
    "searchInput",
    "rmSearch",
    "employeeSearch",
    "search"
  ]);

  if (searchInput) {
    searchInput.value = "";
  }


  const filterIds = [
    "zoneFilter",
    "cityFilter",
    "zmFilter",
    "tlFilter",
    "trainerFilter"
  ];

  filterIds.forEach(id => {

    const element = document.getElementById(id);

    if (element) {
      element.value = "";
    }

  });


  const dateFrom = findElement([
    "dateFrom",
    "fromDate",
    "startDate"
  ]);

  const dateTo = findElement([
    "dateTo",
    "toDate",
    "endDate"
  ]);

  if (dateFrom) dateFrom.value = "";

  if (dateTo) dateTo.value = "";


  filteredData = [...rawData];

  updateDashboard();

}


// ==========================================================
// UPDATE DASHBOARD
// ==========================================================

function updateDashboard() {

  updateSummaryCards();

  updateEmployeeList();

  updatePerformanceTable();

  updateComparisons();

  updateTopPerformers();

  updateSelectedEmployee();

}


// ==========================================================
// SUMMARY CARDS
// ==========================================================

function updateSummaryCards() {

  const uniqueEmployees = new Set(
    filteredData
      .map(row =>
        getField(row, "ecode") ||
        getField(row, "username") ||
        getField(row, "name")
      )
      .filter(Boolean)
  );


  const appointments = sumField(
    filteredData,
    "appointment"
  );

  const visits = sumField(
    filteredData,
    "visit"
  );

  const bookings = sumField(
    filteredData,
    "booking"
  );

  const ape = sumField(
    filteredData,
    "ape"
  );


  const appointmentToVisit =
    appointments > 0
      ? (visits / appointments) * 100
      : 0;


  const visitToBooking =
    visits > 0
      ? (bookings / visits) * 100
      : 0;


  setText(
    [
      "activeRMs",
      "activeRMValue",
      "totalRMs"
    ],
    uniqueEmployees.size
  );


  setText(
    [
      "totalAppointments",
      "appointmentValue",
      "apptValue"
    ],
    formatNumber(appointments)
  );


  setText(
    [
      "totalVisits",
      "visitValue",
      "visitsValue"
    ],
    formatNumber(visits)
  );


  setText(
    [
      "totalBookings",
      "bookingValue",
      "bookingsValue"
    ],
    formatNumber(bookings)
  );


  setText(
    [
      "totalAPE",
      "apeValue"
    ],
    formatCurrency(ape)
  );


  setText(
    [
      "appointmentConversion",
      "apptConversion",
      "appointmentToVisit"
    ],
    formatPercentage(appointmentToVisit)
  );


  setText(
    [
      "visitConversion",
      "visitToBooking",
      "conversionValue"
    ],
    formatPercentage(visitToBooking)
  );

}


// ==========================================================
// EMPLOYEE LIST
// ==========================================================

function updateEmployeeList() {

  const container = findElement([
    "employeeList",
    "rmList",
    "searchResults"
  ]);

  if (!container) return;


  const employees = getEmployeeSummaries(
    filteredData
  );


  if (employees.length === 0) {

    container.innerHTML =
      `<div class="empty-state">
        No employee data found.
      </div>`;

    return;

  }


  container.innerHTML = employees
    .slice(0, 100)
    .map(employee => `

      <div
        class="employee-item"
        data-employee="${escapeHtml(employee.id)}"
      >

        <div class="employee-avatar">
          ${escapeHtml(
            (employee.name || "?")
              .charAt(0)
              .toUpperCase()
          )}
        </div>

        <div class="employee-info">

          <strong>
            ${escapeHtml(
              employee.name || employee.id
            )}
          </strong>

          <span>
            ${escapeHtml(employee.ecode || "")}
            ${employee.username ? " • " + escapeHtml(employee.username) : ""}
          </span>

        </div>

        <div class="employee-ape">
          ${formatCurrency(employee.ape)}
        </div>

      </div>

    `)
    .join("");


  container
    .querySelectorAll(".employee-item")
    .forEach(item => {

      item.addEventListener("click", () => {

        const employeeId =
          item.dataset.employee;

        selectEmployee(employeeId);

      });

    });

}


// ==========================================================
// EMPLOYEE SUMMARY
// ==========================================================

function getEmployeeSummaries(data) {

  const employeeMap = {};


  data.forEach(row => {

    const ecode =
      String(getField(row, "ecode") || "").trim();

    const username =
      String(getField(row, "username") || "").trim();

    const name =
      String(getField(row, "name") || "").trim();


    const id =
      ecode ||
      username ||
      name;


    if (!id) return;


    if (!employeeMap[id]) {

      employeeMap[id] = {

        id,
        ecode,
        username,
        name,

        doj: getField(row, "doj"),

        tl: getField(row, "tl"),

        zm: getField(row, "zm"),

        city: getField(row, "city"),

        zone: getField(row, "zone"),

        trainer: getField(row, "trainer"),

        appointment: 0,

        visit: 0,

        booking: 0,

        ape: 0,

        rows: []

      };

    }


    employeeMap[id].appointment +=
      toNumber(getField(row, "appointment"));

    employeeMap[id].visit +=
      toNumber(getField(row, "visit"));

    employeeMap[id].booking +=
      toNumber(getField(row, "booking"));

    employeeMap[id].ape +=
      toNumber(getField(row, "ape"));

    employeeMap[id].rows.push(row);

  });


  return Object.values(employeeMap)
    .sort((a, b) => b.ape - a.ape);

}


// ==========================================================
// SELECT EMPLOYEE
// ==========================================================

function selectEmployee(employeeId) {

  const employees =
    getEmployeeSummaries(filteredData);

  currentEmployee =
    employees.find(
      employee =>
        employee.id === employeeId
    ) || null;


  updateSelectedEmployee();

}


// ==========================================================
// SELECTED EMPLOYEE DETAILS
// ==========================================================

function updateSelectedEmployee() {

  const container = findElement([
    "employeeDetails",
    "selectedEmployee",
    "rmDetails"
  ]);


  if (!container) return;


  if (!currentEmployee) {

    container.innerHTML = `
      <div class="empty-state">
        Select an RM to view detailed performance.
      </div>
    `;

    return;

  }


  const employee = currentEmployee;


  const appointmentConversion =
    employee.appointment > 0
      ? (employee.visit /
          employee.appointment) * 100
      : 0;


  const visitConversion =
    employee.visit > 0
      ? (employee.booking /
          employee.visit) * 100
      : 0;


  container.innerHTML = `

    <div class="employee-profile">

      <div class="profile-header">

        <div class="profile-avatar">
          ${escapeHtml(
            (employee.name || "?")
              .charAt(0)
              .toUpperCase()
          )}
        </div>

        <div>

          <h2>
            ${escapeHtml(
              employee.name || "-"
            )}
          </h2>

          <p>
            ${escapeHtml(employee.ecode || "-")}
            ${employee.username ? " • " + escapeHtml(employee.username) : ""}
          </p>

        </div>

      </div>


      <div class="profile-grid">

        <div>
          <span>E-code</span>
          <strong>${escapeHtml(employee.ecode || "-")}</strong>
        </div>

        <div>
          <span>Username</span>
          <strong>${escapeHtml(employee.username || "-")}</strong>
        </div>

        <div>
          <span>Date of Joining</span>
          <strong>${formatDate(employee.doj)}</strong>
        </div>

        <div>
          <span>Tenure</span>
          <strong>${calculateTenure(employee.doj)}</strong>
        </div>

        <div>
          <span>TL</span>
          <strong>${escapeHtml(employee.tl || "-")}</strong>
        </div>

        <div>
          <span>ZM</span>
          <strong>${escapeHtml(employee.zm || "-")}</strong>
        </div>

        <div>
          <span>City</span>
          <strong>${escapeHtml(employee.city || "-")}</strong>
        </div>

        <div>
          <span>Zone</span>
          <strong>${escapeHtml(employee.zone || "-")}</strong>
        </div>

        <div>
          <span>Trainer</span>
          <strong>${escapeHtml(employee.trainer || "-")}</strong>
        </div>

      </div>


      <div class="employee-kpis">

        <div class="kpi">
          <span>Appointments</span>
          <strong>${formatNumber(employee.appointment)}</strong>
        </div>

        <div class="kpi">
          <span>Visits</span>
          <strong>${formatNumber(employee.visit)}</strong>
        </div>

        <div class="kpi">
          <span>Bookings</span>
          <strong>${formatNumber(employee.booking)}</strong>
        </div>

        <div class="kpi">
          <span>APE</span>
          <strong>${formatCurrency(employee.ape)}</strong>
        </div>

        <div class="kpi">
          <span>Appointment → Visit</span>
          <strong>${formatPercentage(appointmentConversion)}</strong>
        </div>

        <div class="kpi">
          <span>Visit → Booking</span>
          <strong>${formatPercentage(visitConversion)}</strong>
        </div>

      </div>

    </div>

  `;

}


// ==========================================================
// PERFORMANCE TABLE
// ==========================================================

function updatePerformanceTable() {

  const tbody = findElement([
    "performanceTableBody",
    "dataTableBody",
    "tableBody"
  ]);


  if (!tbody) return;


  const employees =
    getEmployeeSummaries(filteredData);


  tbody.innerHTML =
    employees
      .map((employee, index) => {

        const appointmentConversion =
          employee.appointment > 0
            ? (employee.visit /
                employee.appointment) * 100
            : 0;


        const visitConversion =
          employee.visit > 0
            ? (employee.booking /
                employee.visit) * 100
            : 0;


        return `

          <tr>

            <td>${index + 1}</td>

            <td>
              ${escapeHtml(
                employee.ecode || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                employee.username || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                employee.name || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                employee.zone || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                employee.city || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                employee.zm || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                employee.tl || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                employee.trainer || "-"
              )}
            </td>

            <td>
              ${calculateTenure(employee.doj)}
            </td>

            <td>
              ${formatNumber(employee.appointment)}
            </td>

            <td>
              ${formatNumber(employee.visit)}
            </td>

            <td>
              ${formatNumber(employee.booking)}
            </td>

            <td>
              ${formatPercentage(appointmentConversion)}
            </td>

            <td>
              ${formatPercentage(visitConversion)}
            </td>

            <td>
              ${formatCurrency(employee.ape)}
            </td>

          </tr>

        `;

      })
      .join("");

}


// ==========================================================
// ZONE COMPARISON
// ==========================================================

function updateComparisons() {

  updateZoneComparison();

}


function updateZoneComparison() {

  const container = findElement([
    "zoneComparison",
    "zoneComparisonTable",
    "zoneData"
  ]);


  if (!container) return;


  const zones = {};


  filteredData.forEach(row => {

    const zone =
      getField(row, "zone") ||
      "Unknown";


    if (!zones[zone]) {

      zones[zone] = {

        appointment: 0,

        visit: 0,

        booking: 0,

        ape: 0,

        employees: new Set()

      };

    }


    zones[zone].appointment +=
      toNumber(getField(row, "appointment"));

    zones[zone].visit +=
      toNumber(getField(row, "visit"));

    zones[zone].booking +=
      toNumber(getField(row, "booking"));

    zones[zone].ape +=
      toNumber(getField(row, "ape"));


    const employee =
      getField(row, "ecode") ||
      getField(row, "username") ||
      getField(row, "name");


    if (employee) {

      zones[zone].employees.add(employee);

    }

  });


  const zoneArray =
    Object.entries(zones)
      .map(([zone, data]) => ({
        zone,
        ...data
      }))
      .sort((a, b) =>
        b.ape - a.ape
      );


  container.innerHTML = `

    <table class="comparison-table">

      <thead>

        <tr>

          <th>Zone</th>

          <th>Active RMs</th>

          <th>Appointment</th>

          <th>Visit</th>

          <th>Booking</th>

          <th>APE</th>

          <th>V → B %</th>

        </tr>

      </thead>

      <tbody>

        ${zoneArray.map(item => {

          const conversion =
            item.visit > 0
              ? (item.booking / item.visit) * 100
              : 0;

          return `

            <tr>

              <td>${escapeHtml(item.zone)}</td>

              <td>${item.employees.size}</td>

              <td>${formatNumber(item.appointment)}</td>

              <td>${formatNumber(item.visit)}</td>

              <td>${formatNumber(item.booking)}</td>

              <td>${formatCurrency(item.ape)}</td>

              <td>${formatPercentage(conversion)}</td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


// ==========================================================
// TOP PERFORMERS
// ==========================================================

function updateTopPerformers() {

  const container = findElement([
    "topPerformers",
    "topPerformerList"
  ]);


  if (!container) return;


  const employees =
    getEmployeeSummaries(filteredData)
      .slice(0, 10);


  container.innerHTML =
    employees
      .map((employee, index) => `

        <div class="top-performer">

          <div class="rank">
            ${index + 1}
          </div>

          <div class="performer-info">

            <strong>
              ${escapeHtml(
                employee.name ||
                employee.ecode
              )}
            </strong>

            <span>
              ${escapeHtml(employee.zone || "-")}
              •
              ${escapeHtml(employee.city || "-")}
            </span>

          </div>

          <div class="performer-value">

            ${formatCurrency(employee.ape)}

          </div>

        </div>

      `)
      .join("");

}


// ==========================================================
// REFRESH DATA
// ==========================================================

async function refreshData() {

  const button = findElement([
    "refreshBtn",
    "refreshButton"
  ]);


  const originalText =
    button ? button.innerHTML : "";


  if (button) {

    button.disabled = true;

    button.innerHTML =
      "⏳ Refreshing...";

  }


  await fetchLatestData(false);


  if (button) {

    button.disabled = false;

    button.innerHTML = originalText;

  }

}


// ==========================================================
// LAST UPDATED
// ==========================================================

function updateLastUpdated() {

  const element = findElement([
    "lastUpdated",
    "lastUpdateTime",
    "updateTime"
  ]);


  if (!element) return;


  if (!lastUpdated) {

    element.textContent =
      "Last updated: -";

    return;

  }


  element.textContent =
    "Last updated: " +
    lastUpdated.toLocaleString("en-IN", {

      day: "2-digit",

      month: "short",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit"

    });

}


// ==========================================================
// LOADING STATE
// ==========================================================

function showLoadingState() {

  const loader = findElement([
    "loadingOverlay",
    "loader"
  ]);


  if (loader) {

    loader.style.display = "flex";

  }

}


function hideLoadingState() {

  const loader = findElement([
    "loadingOverlay",
    "loader"
  ]);


  if (loader) {

    loader.style.display = "none";

  }

}


function showErrorState(message) {

  const container = findElement([
    "mainContent",
    "dashboardContent",
    "app"
  ]);


  if (!container) {

    alert(message);

    return;

  }


  console.error(message);

}


// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================

function setText(ids, value) {

  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {

      element.textContent = value;

    }

  });

}


function formatNumber(value) {

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 0
    }
  ).format(toNumber(value));

}


function formatCurrency(value) {

  const number = toNumber(value);


  if (number >= 10000000) {

    return "₹" +
      (number / 10000000)
        .toFixed(2)
        .replace(/\.00$/, "") +
      " Cr";

  }


  if (number >= 100000) {

    return "₹" +
      (number / 100000)
        .toFixed(2)
        .replace(/\.00$/, "") +
      " L";

  }


  if (number >= 1000) {

    return "₹" +
      (number / 1000)
        .toFixed(1)
        .replace(/\.0$/, "") +
      "K";

  }


  return "₹" +
    formatNumber(number);

}


function formatPercentage(value) {

  const number =
    Number(value) || 0;

  return number.toFixed(1) + "%";

}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==========================================================
// AUTO REFRESH IN BACKGROUND
// Every 10 minutes
// ==========================================================

setInterval(() => {

  fetchLatestData(false);

}, 1000 * 60 * 10);


// ==========================================================
// END
// ==========================================================
