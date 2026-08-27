// ==========================================================
// FOS PERFORMANCE PORTAL
// COMPLETE WORKING APPLICATION
// ==========================================================


// ==========================================================
// GOOGLE SHEETS WEB APP URL
// ==========================================================

const GOOGLE_SHEET_API =
  "https://script.google.com/macros/s/AKfycbx3DH5vcJaP3PjC2PwKsIA_ZwIFoF1gdJ-26gOKrjY6MLaakuyqI7dwSKC7xbNlQw/exec";


// ==========================================================
// GLOBAL VARIABLES
// ==========================================================

let rawData = [];

let filteredData = [];

let currentEmployeeData = [];

let currentPage = "dashboard";

let isLoading = false;


// ==========================================================
// SAFE FIELD ALIASES
// ==========================================================

const FIELD_ALIASES = {

  ecode: [
    "ecode",
    "e code",
    "e-code",
    "employee code",
    "employee id",
    "emp code",
    "emp id",
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
    "employee name",
    "rm name",
    "advisor name",
    "fos name"
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
    "tl name",
    "reporting tl"
  ],

  zm: [
    "zm",
    "zone manager",
    "zm name"
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
    "business date",
    "activity date",
    "report date"
  ],

  appointment: [
    "appointment",
    "appointments",
    "appt"
  ],

  visit: [
    "visit",
    "visits"
  ],

  booking: [
    "booking",
    "bookings"
  ],

  ape: [
    "ape",
    "annual premium equivalent",
    "premium"
  ]

};


// ==========================================================
// HELPER FUNCTIONS
// ==========================================================

function normalizeText(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase();

}


function safeString(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();

}


function numberValue(value) {

  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;

}


function percentage(part, total) {

  if (!total || total <= 0) {
    return 0;
  }

  return (part / total) * 100;

}


function formatNumber(value) {

  return numberValue(value).toLocaleString("en-IN");

}


function formatPercent(value) {

  return numberValue(value).toFixed(1) + "%";

}


function formatAPE(value) {

  const amount = numberValue(value);

  if (amount >= 10000000) {
    return "₹" + (amount / 10000000).toFixed(2) + " Cr";
  }

  if (amount >= 100000) {
    return "₹" + (amount / 100000).toFixed(2) + " L";
  }

  return "₹" + amount.toLocaleString("en-IN");

}


function escapeHTML(value) {

  return safeString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ==========================================================
// GET VALUE USING COLUMN ALIASES
// ==========================================================

function getField(record, fieldName) {

  if (!record || typeof record !== "object") {
    return "";
  }


  const aliases = FIELD_ALIASES[fieldName] || [];


  const recordKeys = Object.keys(record);


  // Exact normalized matching

  for (const alias of aliases) {

    const normalizedAlias = normalizeText(alias);

    for (const key of recordKeys) {

      if (normalizeText(key) === normalizedAlias) {
        return record[key];
      }

    }

  }


  // Partial matching

  for (const alias of aliases) {

    const normalizedAlias = normalizeText(alias);

    for (const key of recordKeys) {

      const normalizedKey = normalizeText(key);

      if (
        normalizedKey.includes(normalizedAlias) ||
        normalizedAlias.includes(normalizedKey)
      ) {

        if (normalizedKey.length > 1) {
          return record[key];
        }

      }

    }

  }


  return "";

}


// ==========================================================
// NORMALIZE GOOGLE SHEET RECORD
// ==========================================================

function normalizeRecord(record) {

  const normalized = {

    original: record,

    ecode: safeString(getField(record, "ecode")),

    username: safeString(getField(record, "username")),

    name: safeString(getField(record, "name")),

    doj: safeString(getField(record, "doj")),

    tl: safeString(getField(record, "tl")),

    zm: safeString(getField(record, "zm")),

    city: safeString(getField(record, "city")),

    zone: safeString(getField(record, "zone")),

    trainer: safeString(getField(record, "trainer")),

    date: safeString(getField(record, "date")),

    appointment: numberValue(
      getField(record, "appointment")
    ),

    visit: numberValue(
      getField(record, "visit")
    ),

    booking: numberValue(
      getField(record, "booking")
    ),

    ape: numberValue(
      getField(record, "ape")
    )

  };


  // ========================================================
  // FALLBACK FOR EMPTY ECODE
  // ========================================================

  // If the sheet has an unexpected column structure,
  // try common values from the original record.

  if (!normalized.ecode) {

    const keys = Object.keys(record);

    for (const key of keys) {

      const value = safeString(record[key]);

      if (
        value &&
        (
          normalizeText(key).includes("code") ||
          normalizeText(key).includes("id")
        )
      ) {

        normalized.ecode = value;
        break;

      }

    }

  }


  return normalized;

}


// ==========================================================
// UNIQUE VALUES
// ==========================================================

function uniqueValues(data, field) {

  const values = data
    .map(item => safeString(item[field]))
    .filter(value => value !== "");

  return [...new Set(values)]
    .sort((a, b) => a.localeCompare(b));

}


// ==========================================================
// CACHE DATA
// ==========================================================

function saveToCache(data) {

  try {

    localStorage.setItem(
      "fosPortalData",
      JSON.stringify(data)
    );

    localStorage.setItem(
      "fosPortalLastUpdated",
      new Date().toISOString()
    );

  } catch (error) {

    console.log("Cache save failed");

  }

}


function loadFromCache() {

  try {

    const cached = localStorage.getItem("fosPortalData");

    if (!cached) {
      return [];
    }

    const parsed = JSON.parse(cached);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];

  } catch (error) {

    return [];

  }

}


// ==========================================================
// STATUS
// ==========================================================

function setStatus(message) {

  const element = document.getElementById("dataStatus");

  if (element) {
    element.textContent = message;
  }

}


function setRefreshLoading(loading) {

  const refreshButton =
    document.getElementById("refreshBtn");

  const sideButton =
    document.getElementById("refreshSidebar");


  if (loading) {

    if (refreshButton) {
      refreshButton.textContent = "⏳ Refreshing...";
      refreshButton.disabled = true;
    }

    if (sideButton) {
      sideButton.textContent = "⏳ Refreshing...";
      sideButton.disabled = true;
    }

  } else {

    if (refreshButton) {
      refreshButton.textContent = "↻ Refresh";
      refreshButton.disabled = false;
    }

    if (sideButton) {
      sideButton.textContent = "↻ Refresh Data";
      sideButton.disabled = false;
    }

  }

}


// ==========================================================
// LOAD DATA FROM GOOGLE SHEETS
// ==========================================================

async function loadGoogleSheetData(showLoading = true) {

  if (isLoading) {
    return;
  }


  isLoading = true;


  if (showLoading) {
    setRefreshLoading(true);
  }


  setStatus("Connecting to Google Sheets...");


  try {

    const controller = new AbortController();


    const timeout = setTimeout(() => {

      controller.abort();

    }, 20000);


    const response = await fetch(
      GOOGLE_SHEET_API +
      "?t=" +
      Date.now(),
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      }
    );


    clearTimeout(timeout);


    if (!response.ok) {

      throw new Error(
        "Server returned " + response.status
      );

    }


    const text = await response.text();


    let data;


    try {

      data = JSON.parse(text);

    } catch (error) {

      console.error(
        "Invalid JSON received:",
        text.substring(0, 500)
      );

      throw new Error(
        "Google Sheets did not return valid JSON"
      );

    }


    // ======================================================
    // HANDLE DIFFERENT RESPONSE FORMATS
    // ======================================================

    if (!Array.isArray(data)) {

      if (data && Array.isArray(data.data)) {
        data = data.data;
      }

      else if (data && Array.isArray(data.rows)) {
        data = data.rows;
      }

      else if (data && Array.isArray(data.result)) {
        data = data.result;
      }

      else {
        throw new Error(
          "No data array found in Google Sheets response"
        );
      }

    }


    // ======================================================
    // NORMALIZE DATA
    // ======================================================

    rawData = data
      .filter(item => item && typeof item === "object")
      .map(normalizeRecord);


    filteredData = [...rawData];


    saveToCache(rawData);


    setStatus(
      "✓ " +
      rawData.length +
      " records loaded"
    );


    updateAllFilters();

    applyFilters();

  } catch (error) {

    console.error("Data loading error:", error);


    // Use cached data if available

    const cachedData = loadFromCache();


    if (cachedData.length > 0) {

      rawData = cachedData;

      filteredData = [...rawData];


      setStatus(
        "⚠ Offline data: " +
        rawData.length +
        " records"
      );


      updateAllFilters();

      applyFilters();

    } else {

      setStatus("⚠ Unable to load data");


      renderEmptyDashboard();

    }

  } finally {

    isLoading = false;

    setRefreshLoading(false);

  }

}


// ==========================================================
// UPDATE FILTER DROPDOWNS
// ==========================================================

function populateSelect(id, values, defaultText) {

  const select = document.getElementById(id);

  if (!select) {
    return;
  }


  const currentValue = select.value;


  select.innerHTML =
    `<option value="">${defaultText}</option>`;


  values.forEach(value => {

    const option =
      document.createElement("option");

    option.value = value;

    option.textContent = value;

    select.appendChild(option);

  });


  if (
    currentValue &&
    values.includes(currentValue)
  ) {

    select.value = currentValue;

  }

}


function updateAllFilters() {

  populateSelect(
    "zoneFilter",
    uniqueValues(rawData, "zone"),
    "All Zones"
  );


  populateSelect(
    "cityFilter",
    uniqueValues(rawData, "city"),
    "All Cities"
  );


  populateSelect(
    "tlFilter",
    uniqueValues(rawData, "tl"),
    "All TLs"
  );


  populateSelect(
    "zmFilter",
    uniqueValues(rawData, "zm"),
    "All ZMs"
  );


  populateSelect(
    "trainerFilter",
    uniqueValues(rawData, "trainer"),
    "All Trainers"
  );

}


// ==========================================================
// APPLY FILTERS
// ==========================================================

function applyFilters() {

  const zone =
    document.getElementById("zoneFilter")?.value || "";

  const city =
    document.getElementById("cityFilter")?.value || "";

  const tl =
    document.getElementById("tlFilter")?.value || "";

  const zm =
    document.getElementById("zmFilter")?.value || "";

  const trainer =
    document.getElementById("trainerFilter")?.value || "";


  filteredData = rawData.filter(record => {

    if (
      zone &&
      safeString(record.zone) !== zone
    ) {
      return false;
    }


    if (
      city &&
      safeString(record.city) !== city
    ) {
      return false;
    }


    if (
      tl &&
      safeString(record.tl) !== tl
    ) {
      return false;
    }


    if (
      zm &&
      safeString(record.zm) !== zm
    ) {
      return false;
    }


    if (
      trainer &&
      safeString(record.trainer) !== trainer
    ) {
      return false;
    }


    return true;

  });


  renderDashboard();

}


// ==========================================================
// CLEAR FILTERS
// ==========================================================

function clearFilters() {

  const filterIds = [

    "zoneFilter",
    "cityFilter",
    "tlFilter",
    "zmFilter",
    "trainerFilter"

  ];


  filterIds.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.value = "";
    }

  });


  applyFilters();

}


// ==========================================================
// DASHBOARD CALCULATIONS
// ==========================================================

function calculateTotals(data) {

  const totals = {

    employees: 0,

    appointments: 0,

    visits: 0,

    bookings: 0,

    ape: 0

  };


  const employeeIds = new Set();


  data.forEach(record => {

    totals.appointments +=
      numberValue(record.appointment);


    totals.visits +=
      numberValue(record.visit);


    totals.bookings +=
      numberValue(record.booking);


    totals.ape +=
      numberValue(record.ape);


    // ECODE

    if (record.ecode) {

      employeeIds.add(record.ecode);

    }

    // USERNAME FALLBACK

    else if (record.username) {

      employeeIds.add(record.username);

    }

    // NAME FALLBACK

    else if (record.name) {

      employeeIds.add(record.name);

    }

  });


  totals.employees =
    employeeIds.size;


  return totals;

}


// ==========================================================
// RENDER DASHBOARD
// ==========================================================

function renderDashboard() {

  const totals =
    calculateTotals(filteredData);


  const activeEmployees =
    document.getElementById("activeEmployees");

  const totalAppointments =
    document.getElementById("totalAppointments");

  const totalVisits =
    document.getElementById("totalVisits");

  const totalBookings =
    document.getElementById("totalBookings");

  const totalAPE =
    document.getElementById("totalAPE");

  const visitPercent =
    document.getElementById("visitPercent");

  const appointmentConversion =
    document.getElementById("appointmentConversion");

  const visitConversion =
    document.getElementById("visitConversion");


  if (activeEmployees) {
    activeEmployees.textContent =
      formatNumber(totals.employees);
  }


  if (totalAppointments) {
    totalAppointments.textContent =
      formatNumber(totals.appointments);
  }


  if (totalVisits) {
    totalVisits.textContent =
      formatNumber(totals.visits);
  }


  if (totalBookings) {
    totalBookings.textContent =
      formatNumber(totals.bookings);
  }


  if (totalAPE) {
    totalAPE.textContent =
      formatAPE(totals.ape);
  }


  const visitRate =
    percentage(
      totals.visits,
      totals.appointments
    );


  const appointmentConv =
    percentage(
      totals.bookings,
      totals.appointments
    );


  const visitConv =
    percentage(
      totals.bookings,
      totals.visits
    );


  if (visitPercent) {
    visitPercent.textContent =
      formatPercent(visitRate) +
      " visit rate";
  }


  if (appointmentConversion) {
    appointmentConversion.textContent =
      formatPercent(appointmentConv) +
      " appointment conversion";
  }


  if (visitConversion) {
    visitConversion.textContent =
      formatPercent(visitConv);
  }


  renderTopEmployees();

  renderZoneSummary();

  renderZoneTable();

  renderAllData();

}


// ==========================================================
// TOP EMPLOYEES
// ==========================================================

function getEmployeeKey(record) {

  if (record.ecode) {
    return record.ecode;
  }

  if (record.username) {
    return record.username;
  }

  if (record.name) {
    return record.name;
  }

  return "Unknown";

}


function renderTopEmployees() {

  const container =
    document.getElementById("topEmployees");

  if (!container) {
    return;
  }


  if (filteredData.length === 0) {

    container.innerHTML =
      `<p class="empty-message">
        No employee data available.
      </p>`;

    return;

  }


  const employees = {};


  filteredData.forEach(record => {

    const key =
      getEmployeeKey(record);


    if (!employees[key]) {

      employees[key] = {

        key: key,

        name:
          record.name ||
          record.username ||
          record.ecode ||
          "Unknown",

        zone: record.zone,

        city: record.city,

        ape: 0

      };

    }


    employees[key].ape +=
      numberValue(record.ape);

  });


  const topEmployees =
    Object.values(employees)
      .sort((a, b) => b.ape - a.ape)
      .slice(0, 8);


  container.innerHTML =
    topEmployees.map((employee, index) => {

      return `

        <div class="list-row">

          <div>

            <div class="list-name">
              ${index + 1}. ${escapeHTML(employee.name)}
            </div>

            <div class="list-sub">
              ${escapeHTML(employee.zone || "No Zone")}
              ·
              ${escapeHTML(employee.city || "No City")}
            </div>

          </div>


          <div class="list-value">
            ${formatAPE(employee.ape)}
          </div>

        </div>

      `;

    }).join("");

}


// ==========================================================
// ZONE SUMMARY
// ==========================================================

function calculateZoneData() {

  const zones = {};


  filteredData.forEach(record => {

    const zone =
      record.zone || "Unassigned";


    if (!zones[zone]) {

      zones[zone] = {

        zone: zone,

        employees: new Set(),

        appointments: 0,

        visits: 0,

        bookings: 0,

        ape: 0

      };

    }


    zones[zone].employees.add(
      getEmployeeKey(record)
    );


    zones[zone].appointments +=
      numberValue(record.appointment);


    zones[zone].visits +=
      numberValue(record.visit);


    zones[zone].bookings +=
      numberValue(record.booking);


    zones[zone].ape +=
      numberValue(record.ape);

  });


  return Object.values(zones)
    .map(zone => {

      return {

        ...zone,

        employeeCount:
          zone.employees.size

      };

    })
    .sort((a, b) => b.ape - a.ape);

}


function renderZoneSummary() {

  const container =
    document.getElementById("zoneSummary");

  if (!container) {
    return;
  }


  const zones =
    calculateZoneData()
      .slice(0, 8);


  if (zones.length === 0) {

    container.innerHTML =
      `<p class="empty-message">
        No zone data available.
      </p>`;

    return;

  }


  container.innerHTML =
    zones.map(zone => {

      return `

        <div class="list-row">

          <div>

            <div class="list-name">
              ${escapeHTML(zone.zone)}
            </div>

            <div class="list-sub">
              ${zone.employeeCount} employees
              ·
              ${formatNumber(zone.bookings)} bookings
            </div>

          </div>


          <div class="list-value">
            ${formatAPE(zone.ape)}
          </div>

        </div>

      `;

    }).join("");

}


// ==========================================================
// ZONE TABLE
// ==========================================================

function renderZoneTable() {

  const tbody =
    document.getElementById("zoneTableBody");

  if (!tbody) {
    return;
  }


  const zones =
    calculateZoneData();


  if (zones.length === 0) {

    tbody.innerHTML =
      `<tr>
        <td colspan="8">
          No zone data available.
        </td>
      </tr>`;

    return;

  }


  tbody.innerHTML =
    zones.map(zone => {

      const appointmentConversion =
        percentage(
          zone.bookings,
          zone.appointments
        );


      const visitConversion =
        percentage(
          zone.bookings,
          zone.visits
        );


      return `

        <tr>

          <td>
            ${escapeHTML(zone.zone)}
          </td>

          <td>
            ${formatNumber(zone.employeeCount)}
          </td>

          <td>
            ${formatNumber(zone.appointments)}
          </td>

          <td>
            ${formatNumber(zone.visits)}
          </td>

          <td>
            ${formatNumber(zone.bookings)}
          </td>

          <td>
            ${formatAPE(zone.ape)}
          </td>

          <td>
            ${formatPercent(appointmentConversion)}
          </td>

          <td>
            ${formatPercent(visitConversion)}
          </td>

        </tr>

      `;

    }).join("");

}


// ==========================================================
// EMPLOYEE SEARCH
// ==========================================================

function searchEmployee() {

  const input =
    document.getElementById("employeeSearch");

  if (!input) {
    return;
  }


  const searchText =
    normalizeText(input.value);


  if (!searchText) {

    alert(
      "Please enter E-Code, Username or Employee Name."
    );

    return;

  }


  currentEmployeeData =
    rawData.filter(record => {

      return [

        record.ecode,

        record.username,

        record.name

      ].some(value =>

        normalizeText(value)
          .includes(searchText)

      );

    });


  renderEmployeeProfile();

  renderEmployeeTable();

}


// ==========================================================
// EMPLOYEE PROFILE
// ==========================================================

function renderEmployeeProfile() {

  const container =
    document.getElementById("employeeProfile");

  if (!container) {
    return;
  }


  if (currentEmployeeData.length === 0) {

    container.innerHTML =
      `<div class="empty-state">
        No employee found.
      </div>`;

    return;

  }


  const first =
    currentEmployeeData[0];


  const totals =
    calculateTotals(
      currentEmployeeData
    );


  const appointmentConv =
    percentage(
      totals.bookings,
      totals.appointments
    );


  const visitConv =
    percentage(
      totals.bookings,
      totals.visits
    );


  const tenure =
    calculateTenure(first.doj);


  container.innerHTML = `

    <div class="profile-grid">

      <div class="profile-item">
        <label>Name</label>
        <strong>
          ${escapeHTML(first.name || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>E-Code</label>
        <strong>
          ${escapeHTML(first.ecode || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>Username</label>
        <strong>
          ${escapeHTML(first.username || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>Date of Joining</label>
        <strong>
          ${escapeHTML(first.doj || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>Tenure</label>
        <strong>
          ${escapeHTML(tenure)}
        </strong>
      </div>


      <div class="profile-item">
        <label>TL</label>
        <strong>
          ${escapeHTML(first.tl || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>ZM</label>
        <strong>
          ${escapeHTML(first.zm || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>Trainer</label>
        <strong>
          ${escapeHTML(first.trainer || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>City</label>
        <strong>
          ${escapeHTML(first.city || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>Zone</label>
        <strong>
          ${escapeHTML(first.zone || "Not Available")}
        </strong>
      </div>


      <div class="profile-item">
        <label>Total Appointment</label>
        <strong>
          ${formatNumber(totals.appointments)}
        </strong>
      </div>


      <div class="profile-item">
        <label>Total Visit</label>
        <strong>
          ${formatNumber(totals.visits)}
        </strong>
      </div>


      <div class="profile-item">
        <label>Total Booking</label>
        <strong>
          ${formatNumber(totals.bookings)}
        </strong>
      </div>


      <div class="profile-item">
        <label>Total APE</label>
        <strong>
          ${formatAPE(totals.ape)}
        </strong>
      </div>


      <div class="profile-item">
        <label>Appointment Conversion</label>
        <strong>
          ${formatPercent(appointmentConv)}
        </strong>
      </div>


      <div class="profile-item">
        <label>Visit Conversion</label>
        <strong>
          ${formatPercent(visitConv)}
        </strong>
      </div>

    </div>

  `;

}


// ==========================================================
// EMPLOYEE TABLE
// ==========================================================

function renderEmployeeTable() {

  const tbody =
    document.getElementById(
      "employeeTableBody"
    );

  if (!tbody) {
    return;
  }


  if (currentEmployeeData.length === 0) {

    tbody.innerHTML =
      `<tr>
        <td colspan="7">
          No employee data available.
        </td>
      </tr>`;

    return;

  }


  tbody.innerHTML =
    currentEmployeeData.map(record => {

      const appointmentConv =
        percentage(
          record.booking,
          record.appointment
        );


      const visitConv =
        percentage(
          record.booking,
          record.visit
        );


      return `

        <tr>

          <td>
            ${escapeHTML(record.date || "-")}
          </td>

          <td>
            ${formatNumber(record.appointment)}
          </td>

          <td>
            ${formatNumber(record.visit)}
          </td>

          <td>
            ${formatNumber(record.booking)}
          </td>

          <td>
            ${formatAPE(record.ape)}
          </td>

          <td>
            ${formatPercent(appointmentConv)}
          </td>

          <td>
            ${formatPercent(visitConv)}
          </td>

        </tr>

      `;

    }).join("");

}


// ==========================================================
// TENURE
// ==========================================================

function calculateTenure(doj) {

  if (!doj) {
    return "Not Available";
  }


  const date =
    new Date(doj);


  if (Number.isNaN(date.getTime())) {
    return "Not Available";
  }


  const today =
    new Date();


  let months =
    (today.getFullYear() -
      date.getFullYear()) *
    12;


  months +=
    today.getMonth() -
    date.getMonth();


  if (months < 0) {
    months = 0;
  }


  const years =
    Math.floor(months / 12);


  const remainingMonths =
    months % 12;


  if (years > 0) {

    return (
      years +
      "y " +
      remainingMonths +
      "m"
    );

  }


  return (
    remainingMonths +
    " months"
  );

}


// ==========================================================
// ALL DATA TABLE
// ==========================================================

function renderAllData() {

  const head =
    document.getElementById("allDataHead");

  const body =
    document.getElementById("allDataBody");

  const count =
    document.getElementById("recordCount");


  if (!head || !body) {
    return;
  }


  if (count) {

    count.textContent =
      filteredData.length;

  }


  if (rawData.length === 0) {

    head.innerHTML = "";

    body.innerHTML =
      `<tr>
        <td>No data available.</td>
      </tr>`;

    return;

  }


  // Use original Google Sheet columns

  const allKeys =
    new Set();


  filteredData.forEach(record => {

    Object.keys(
      record.original || {}
    ).forEach(key => {

      if (key.trim() !== "") {
        allKeys.add(key);
      }

    });

  });


  const columns =
    Array.from(allKeys);


  if (columns.length === 0) {

    // Fallback normalized columns

    columns.push(
      "E-Code",
      "Username",
      "Name",
      "DOJ",
      "TL",
      "ZM",
      "City",
      "Zone",
      "Trainer",
      "Date",
      "Appointment",
      "Visit",
      "Booking",
      "APE"
    );

  }


  head.innerHTML =
    `<tr>` +
    columns.map(column =>

      `<th>
        ${escapeHTML(column)}
      </th>`

    ).join("") +
    `</tr>`;


  const maxRows =
    Math.min(
      filteredData.length,
      500
    );


  body.innerHTML =
    filteredData
      .slice(0, maxRows)
      .map(record => {

        return `

          <tr>

            ${columns.map(column => {

              let value =
                record.original?.[column];


              // Fallback normalized values

              if (
                value === undefined &&
                column === "E-Code"
              ) {
                value = record.ecode;
              }


              if (
                value === undefined &&
                column === "Username"
              ) {
                value = record.username;
              }


              if (
                value === undefined &&
                column === "Name"
              ) {
                value = record.name;
              }


              return `

                <td>
                  ${escapeHTML(
                    value === undefined
                      ? ""
                      : value
                  )}
                </td>

              `;

            }).join("")}

          </tr>

        `;

      }).join("");


  if (
    filteredData.length >
    maxRows
  ) {

    body.innerHTML += `

      <tr>

        <td colspan="${columns.length}">

          Showing first ${maxRows}
          records out of
          ${filteredData.length}.

        </td>

      </tr>

    `;

  }

}


// ==========================================================
// GLOBAL SEARCH
// ==========================================================

function globalSearch() {

  const input =
    document.getElementById(
      "globalSearch"
    );

  if (!input) {
    return;
  }


  const searchText =
    normalizeText(input.value);


  if (!searchText) {

    filteredData = [...rawData];

    renderDashboard();

    return;

  }


  filteredData =
    rawData.filter(record => {

      const values = [

        record.ecode,

        record.username,

        record.name,

        record.zone,

        record.city,

        record.tl,

        record.zm,

        record.trainer

      ];


      return values.some(value =>

        normalizeText(value)
          .includes(searchText)

      );

    });


  renderDashboard();

}


// ==========================================================
// NAVIGATION
// ==========================================================

function showPage(pageName) {

  currentPage =
    pageName;


  const pages = {

    dashboard: "dashboardPage",

    employee: "employeePage",

    zone: "zonePage",

    data: "dataPage"

  };


  // Hide all pages

  document.querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove(
        "active-page"
      );

    });


  // Show selected page

  const pageId =
    pages[pageName];


  const page =
    document.getElementById(pageId);


  if (page) {

    page.classList.add(
      "active-page"
    );

  }


  // Update navigation

  document.querySelectorAll(".nav-btn")
    .forEach(button => {

      button.classList.remove(
        "active"
      );


      if (
        button.dataset.page ===
        pageName
      ) {

        button.classList.add(
          "active"
        );

      }

    });


  updatePageTitle(pageName);


  // Render data for selected page

  if (pageName === "zone") {

    renderZoneTable();

  }


  if (pageName === "data") {

    renderAllData();

  }


  // Scroll to top

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// ==========================================================
// PAGE TITLES
// ==========================================================

function updatePageTitle(pageName) {

  const title =
    document.getElementById(
      "pageTitle"
    );

  const subtitle =
    document.getElementById(
      "pageSubtitle"
    );


  const titles = {

    dashboard: {
      title: "Performance Dashboard",
      subtitle: "Live data from Google Sheets"
    },

    employee: {
      title: "Employee Performance",
      subtitle: "Analyse individual employee productivity"
    },

    zone: {
      title: "Zone Comparison",
      subtitle: "Compare business performance across zones"
    },

    data: {
      title: "All Data",
      subtitle: "Complete data from Google Sheets"
    }

  };


  const info =
    titles[pageName];


  if (!info) {
    return;
  }


  if (title) {
    title.textContent =
      info.title;
  }


  if (subtitle) {
    subtitle.textContent =
      info.subtitle;
  }

}


// ==========================================================
// EMPTY DASHBOARD
// ==========================================================

function renderEmptyDashboard() {

  const ids = [

    "activeEmployees",

    "totalAppointments",

    "totalVisits",

    "totalBookings",

    "totalAPE",

    "visitConversion"

  ];


  ids.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {

      if (id === "totalAPE") {
        element.textContent = "₹0";
      }

      else if (
        id === "visitConversion"
      ) {
        element.textContent = "0%";
      }

      else {
        element.textContent = "0";
      }

    }

  });

}


// ==========================================================
// EVENT LISTENERS
// ==========================================================

function setupEventListeners() {

  // NAVIGATION

  document.querySelectorAll(".nav-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        function () {

          const pageName =
            this.dataset.page;

          showPage(pageName);

        }
      );

    });


  // REFRESH BUTTON

  const refreshButton =
    document.getElementById(
      "refreshBtn"
    );

  if (refreshButton) {

    refreshButton.addEventListener(
      "click",
      function () {

        loadGoogleSheetData(true);

      }
    );

  }


  // SIDEBAR REFRESH

  const refreshSidebar =
    document.getElementById(
      "refreshSidebar"
    );

  if (refreshSidebar) {

    refreshSidebar.addEventListener(
      "click",
      function () {

        loadGoogleSheetData(true);

      }
    );

  }


  // FILTERS

  const filters = [

    "zoneFilter",

    "cityFilter",

    "tlFilter",

    "zmFilter",

    "trainerFilter"

  ];


  filters.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {

      element.addEventListener(
        "change",
        applyFilters
      );

    }

  });


  // CLEAR FILTERS

  const clearButton =
    document.getElementById(
      "clearFilters"
    );

  if (clearButton) {

    clearButton.addEventListener(
      "click",
      clearFilters
    );

  }


  // GLOBAL SEARCH

  const globalSearchInput =
    document.getElementById(
      "globalSearch"
    );

  if (globalSearchInput) {

    globalSearchInput.addEventListener(
      "input",
      globalSearch
    );

  }


  // EMPLOYEE SEARCH

  const employeeSearchButton =
    document.getElementById(
      "employeeSearchBtn"
    );

  if (employeeSearchButton) {

    employeeSearchButton.addEventListener(
      "click",
      searchEmployee
    );

  }


  const employeeSearchInput =
    document.getElementById(
      "employeeSearch"
    );

  if (employeeSearchInput) {

    employeeSearchInput.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Enter"
        ) {

          searchEmployee();

        }

      }
    );

  }

}


// ==========================================================
// START APPLICATION
// ==========================================================

async function startApp() {

  console.log(
    "Starting FOS Performance Portal"
  );


  setupEventListeners();


  // ========================================================
  // LOAD CACHE FIRST
  // This makes the portal open quickly
  // ========================================================

  const cachedData =
    loadFromCache();


  if (cachedData.length > 0) {

    rawData =
      cachedData;

    filteredData =
      [...rawData];


    setStatus(
      "✓ Cached data loaded"
    );


    updateAllFilters();

    renderDashboard();

  }


  // ========================================================
  // THEN LOAD FRESH GOOGLE SHEET DATA
  // ========================================================

  await loadGoogleSheetData(
    cachedData.length === 0
  );

}


// ==========================================================
// DOM READY
// ==========================================================

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startApp
  );

} else {

  startApp();

}
