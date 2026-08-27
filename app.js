// ==========================================
// FOS DASHBOARD - GOOGLE SHEETS VERSION
// ==========================================

// YOUR GOOGLE APPS SCRIPT WEB APP URL
const GOOGLE_SHEET_API =
  "https://script.google.com/macros/s/AKfycbxj4T2tfxd_O0Tg84RnqGkS4XBjOurS1hKeJv8fFkFPGwj5D2huFJth8r51IyEeU0E/exec";

let allData = [];
let filteredData = [];
let rmData = [];

// ==========================================
// START APPLICATION
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  loadGoogleSheetData();

  setupFilters();
  setupRefreshButton();
  setupNavigation();
});


// ==========================================
// LOAD DATA FROM GOOGLE SHEET
// ==========================================

async function loadGoogleSheetData() {

  console.log("Loading Google Sheet data...");

  showStatus("Loading data from Google Sheets...");

  try {

    const response = await fetch(GOOGLE_SHEET_API, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error("Unable to connect to Google Sheet");
    }

    const data = await response.json();

    console.log("Google Sheet Data:", data);

    if (!Array.isArray(data)) {
      throw new Error("Data received is not in the correct format");
    }

    allData = data;

    filteredData = [...allData];

    console.log("Total rows:", allData.length);

    populateDropdowns();

    processDashboard();

    showStatus(
      "Connected to Google Sheets ✓"
    );

  } catch (error) {

    console.error(error);

    showStatus(
      "Connection failed: " + error.message
    );

    alert(
      "Unable to load Google Sheet data.\n\n" +
      "Please check:\n" +
      "1. Apps Script deployment\n" +
      "2. Web App URL\n" +
      "3. Access permissions"
    );
  }
}


// ==========================================
// COLUMN FINDER
// Automatically finds your columns
// ==========================================

function getValue(row, possibleNames) {

  if (!row) return "";

  const keys = Object.keys(row);

  for (let name of possibleNames) {

    const foundKey = keys.find(key =>
      cleanName(key) === cleanName(name)
    );

    if (foundKey !== undefined) {
      return row[foundKey];
    }
  }

  for (let name of possibleNames) {

    const foundKey = keys.find(key =>
      cleanName(key).includes(cleanName(name)) ||
      cleanName(name).includes(cleanName(key))
    );

    if (foundKey !== undefined) {
      return row[foundKey];
    }
  }

  return "";
}


function cleanName(value) {

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");
}


// ==========================================
// CONVERT VALUE TO NUMBER
// ==========================================

function numberValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const cleanValue = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();

  const result = Number(cleanValue);

  return isNaN(result) ? 0 : result;
}


// ==========================================
// NORMALISE DATA
// ==========================================

function normalizeData(data) {

  return data.map(row => {

    return {

      raw: row,

      date: getValue(row, [
        "Date",
        "Date Wise",
        "Visit Date"
      ]),

      ecode: getValue(row, [
        "Ecode",
        "E-Code",
        "E Code",
        "Employee Code",
        "Employee ID"
      ]),

      username: getValue(row, [
        "Username",
        "User Name",
        "User"
      ]),

      name: getValue(row, [
        "Name",
        "RM Name",
        "Employee Name"
      ]),

      doj: getValue(row, [
        "DOJ",
        "Date of Joining",
        "Joining Date"
      ]),

      tl: getValue(row, [
        "TL",
        "TL Name",
        "Team Leader"
      ]),

      zm: getValue(row, [
        "ZM",
        "ZM Name",
        "Zonal Manager"
      ]),

      city: getValue(row, [
        "City",
        "Location"
      ]),

      zone: getValue(row, [
        "Zone",
        "Region"
      ]),

      trainer: getValue(row, [
        "Trainer",
        "Trainer Name"
      ]),

      appointments: numberValue(
        getValue(row, [
          "Appointments",
          "Appointment",
          "Appt"
        ])
      ),

      visits: numberValue(
        getValue(row, [
          "Visits",
          "Visit"
        ])
      ),

      bookings: numberValue(
        getValue(row, [
          "Bookings",
          "Booking"
        ])
      ),

      ape: numberValue(
        getValue(row, [
          "APE"
        ])
      ),

      my: numberValue(
        getValue(row, [
          "MY",
          "Multi Year",
          "Multi-Year"
        ])
      )

    };

  });

}


// ==========================================
// PROCESS DASHBOARD
// ==========================================

function processDashboard() {

  const normalisedData =
    normalizeData(filteredData);

  rmData =
    createRMSummary(normalisedData);

  updateDashboard();

  renderRMTable();

  renderZoneComparison();

  renderTrainerComparison();

  renderInsights();

}


// ==========================================
// CREATE RM SUMMARY
// ==========================================

function createRMSummary(data) {

  const groups = {};

  data.forEach(row => {

    const key =
      row.ecode ||
      row.username ||
      row.name ||
      "Unknown";

    if (!groups[key]) {

      groups[key] = {

        ecode: row.ecode,
        username: row.username,
        name: row.name,
        doj: row.doj,
        tl: row.tl,
        zm: row.zm,
        city: row.city,
        zone: row.zone,
        trainer: row.trainer,

        appointments: 0,
        visits: 0,
        bookings: 0,
        ape: 0,
        my: 0,

        rows: []

      };

    }

    const rm = groups[key];

    rm.appointments += row.appointments;
    rm.visits += row.visits;
    rm.bookings += row.bookings;
    rm.ape += row.ape;
    rm.my += row.my;

    rm.rows.push(row);

  });

  return Object.values(groups).map(rm => {

    rm.visitPercent =
      calculatePercentage(
        rm.visits,
        rm.appointments
      );

    rm.appointmentConversion =
      calculatePercentage(
        rm.bookings,
        rm.appointments
      );

    rm.visitConversion =
      calculatePercentage(
        rm.bookings,
        rm.visits
      );

    rm.myShare =
      calculatePercentage(
        rm.my,
        rm.ape
      );

    rm.tenureDays =
      calculateTenure(rm.doj);

    return rm;

  });

}


// ==========================================
// DASHBOARD TOTALS
// ==========================================

function updateDashboard() {

  let appointments = 0;
  let visits = 0;
  let bookings = 0;
  let ape = 0;
  let my = 0;

  rmData.forEach(rm => {

    appointments += rm.appointments;
    visits += rm.visits;
    bookings += rm.bookings;
    ape += rm.ape;
    my += rm.my;

  });


  const visitPercent =
    calculatePercentage(
      visits,
      appointments
    );

  const appointmentConversion =
    calculatePercentage(
      bookings,
      appointments
    );

  const visitConversion =
    calculatePercentage(
      bookings,
      visits
    );

  const myShare =
    calculatePercentage(
      my,
      ape
    );


  // These IDs will update if they exist in index.html

  updateElement(
    "kpiActiveRMs",
    rmData.length
  );

  updateElement(
    "kpiAppointments",
    formatNumber(appointments)
  );

  updateElement(
    "kpiVisits",
    formatNumber(visits)
  );

  updateElement(
    "kpiBookings",
    formatNumber(bookings)
  );

  updateElement(
    "kpiAPE",
    formatCurrency(ape)
  );

  updateElement(
    "kpiMY",
    formatCurrency(my)
  );

  updateElement(
    "kpiVisitPercent",
    visitPercent.toFixed(1) + "%"
  );

  updateElement(
    "kpiAppointmentConversion",
    appointmentConversion.toFixed(1) + "%"
  );

  updateElement(
    "kpiVisitConversion",
    visitConversion.toFixed(1) + "%"
  );

  updateElement(
    "kpiMYShare",
    myShare.toFixed(1) + "%"
  );


  console.log({
    activeRMs: rmData.length,
    appointments,
    visits,
    bookings,
    ape,
    my
  });

}


// ==========================================
// POPULATE DROPDOWNS
// ==========================================

function populateDropdowns() {

  populateDropdown(
    "zoneFilter",
    allData.map(row =>
      getValue(row, ["Zone"])
    )
  );

  populateDropdown(
    "cityFilter",
    allData.map(row =>
      getValue(row, ["City"])
    )
  );

  populateDropdown(
    "tlFilter",
    allData.map(row =>
      getValue(row, ["TL", "TL Name"])
    )
  );

  populateDropdown(
    "zmFilter",
    allData.map(row =>
      getValue(row, ["ZM", "ZM Name"])
    )
  );

  populateDropdown(
    "trainerFilter",
    allData.map(row =>
      getValue(row, ["Trainer", "Trainer Name"])
    )
  );

}


function populateDropdown(id, values) {

  const dropdown =
    document.getElementById(id);

  if (!dropdown) return;

  const currentValue =
    dropdown.value;

  const uniqueValues =
    [...new Set(
      values
        .filter(value =>
          value !== "" &&
          value !== null &&
          value !== undefined
        )
        .map(value =>
          String(value).trim()
        )
    )].sort();

  dropdown.innerHTML =
    '<option value="">All</option>';

  uniqueValues.forEach(value => {

    const option =
      document.createElement("option");

    option.value = value;

    option.textContent = value;

    dropdown.appendChild(option);

  });

  dropdown.value =
    currentValue;

}


// ==========================================
// SETUP FILTERS
// ==========================================

function setupFilters() {

  const filters = [

    "globalSearch",
    "zoneFilter",
    "cityFilter",
    "tlFilter",
    "zmFilter",
    "trainerFilter",
    "dateFrom",
    "dateTo"

  ];

  filters.forEach(id => {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.addEventListener(
      "input",
      applyFilters
    );

    element.addEventListener(
      "change",
      applyFilters
    );

  });

}


// ==========================================
// APPLY FILTERS
// ==========================================

function applyFilters() {

  const search =
    getFilterValue("globalSearch")
      .toLowerCase();

  const zone =
    getFilterValue("zoneFilter");

  const city =
    getFilterValue("cityFilter");

  const tl =
    getFilterValue("tlFilter");

  const zm =
    getFilterValue("zmFilter");

  const trainer =
    getFilterValue("trainerFilter");


  filteredData =
    allData.filter(row => {

      const ecode =
        String(
          getValue(row, [
            "Ecode",
            "E-Code",
            "E Code"
          ])
        ).toLowerCase();

      const username =
        String(
          getValue(row, [
            "Username",
            "User Name"
          ])
        ).toLowerCase();

      const name =
        String(
          getValue(row, [
            "Name",
            "RM Name"
          ])
        ).toLowerCase();


      const rowZone =
        String(
          getValue(row, ["Zone"])
        );

      const rowCity =
        String(
          getValue(row, ["City"])
        );

      const rowTL =
        String(
          getValue(row, [
            "TL",
            "TL Name"
          ])
        );

      const rowZM =
        String(
          getValue(row, [
            "ZM",
            "ZM Name"
          ])
        );

      const rowTrainer =
        String(
          getValue(row, [
            "Trainer",
            "Trainer Name"
          ])
        );


      if (
        search &&
        !(
          ecode.includes(search) ||
          username.includes(search) ||
          name.includes(search)
        )
      ) {
        return false;
      }


      if (
        zone &&
        rowZone !== zone
      ) {
        return false;
      }


      if (
        city &&
        rowCity !== city
      ) {
        return false;
      }


      if (
        tl &&
        rowTL !== tl
      ) {
        return false;
      }


      if (
        zm &&
        rowZM !== zm
      ) {
        return false;
      }


      if (
        trainer &&
        rowTrainer !== trainer
      ) {
        return false;
      }


      return true;

    });


  processDashboard();

}


// ==========================================
// RM PERFORMANCE TABLE
// ==========================================

function renderRMTable() {

  const table =
    document.getElementById("rmTable");

  if (!table) return;

  const tbody =
    table.querySelector("tbody");

  if (!tbody) return;


  const sortedData =
    [...rmData].sort(
      (a, b) =>
        b.ape - a.ape
    );


  if (!sortedData.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="20">
          No data available
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    sortedData.map(rm => `

      <tr>

        <td>${escapeHTML(rm.ecode)}</td>

        <td>${escapeHTML(rm.username)}</td>

        <td>
          <strong>
            ${escapeHTML(rm.name)}
          </strong>
        </td>

        <td>${formatDate(rm.doj)}</td>

        <td>
          ${formatTenure(rm.tenureDays)}
        </td>

        <td>${escapeHTML(rm.tl)}</td>

        <td>${escapeHTML(rm.zm)}</td>

        <td>${escapeHTML(rm.city)}</td>

        <td>${escapeHTML(rm.zone)}</td>

        <td>${escapeHTML(rm.trainer)}</td>

        <td>
          ${formatNumber(rm.appointments)}
        </td>

        <td>
          ${formatNumber(rm.visits)}
        </td>

        <td>
          ${formatNumber(rm.bookings)}
        </td>

        <td>
          ${rm.visitPercent.toFixed(1)}%
        </td>

        <td>
          ${rm.appointmentConversion.toFixed(1)}%
        </td>

        <td>
          ${rm.visitConversion.toFixed(1)}%
        </td>

        <td>
          ${formatCurrency(rm.ape)}
        </td>

        <td>
          ${formatCurrency(rm.my)}
        </td>

        <td>
          ${rm.myShare.toFixed(1)}%
        </td>

      </tr>

    `).join("");

}


// ==========================================
// ZONE COMPARISON
// ==========================================

function renderZoneComparison() {

  const groups =
    groupData(
      rmData,
      "zone"
    );

  const table =
    document.getElementById(
      "zoneTable"
    );

  if (!table) return;

  const tbody =
    table.querySelector("tbody");

  if (!tbody) return;


  tbody.innerHTML =
    groups.map(group => `

      <tr>

        <td>
          <strong>
            ${escapeHTML(group.name)}
          </strong>
        </td>

        <td>
          ${group.rms}
        </td>

        <td>
          ${formatNumber(
            group.appointments
          )}
        </td>

        <td>
          ${formatNumber(
            group.visits
          )}
        </td>

        <td>
          ${formatNumber(
            group.bookings
          )}
        </td>

        <td>
          ${group.visitPercent.toFixed(1)}%
        </td>

        <td>
          ${group.appointmentConversion.toFixed(1)}%
        </td>

        <td>
          ${group.visitConversion.toFixed(1)}%
        </td>

        <td>
          ${formatCurrency(group.ape)}
        </td>

        <td>
          ${formatCurrency(group.my)}
        </td>

        <td>
          ${group.myShare.toFixed(1)}%
        </td>

      </tr>

    `).join("");

}


// ==========================================
// TRAINER / TL / ZM COMPARISON
// ==========================================

function renderTrainerComparison() {

  renderGroupTable(
    "trainerTable",
    groupData(rmData, "trainer")
  );

  renderGroupTable(
    "tlTable",
    groupData(rmData, "tl")
  );

  renderGroupTable(
    "zmTable",
    groupData(rmData, "zm")
  );

}


function renderGroupTable(
  tableId,
  groups
) {

  const table =
    document.getElementById(tableId);

  if (!table) return;

  const tbody =
    table.querySelector("tbody");

  if (!tbody) return;


  tbody.innerHTML =
    groups.map(group => `

      <tr>

        <td>
          <strong>
            ${escapeHTML(group.name)}
          </strong>
        </td>

        <td>
          ${group.rms}
        </td>

        <td>
          ${formatNumber(group.bookings)}
        </td>

        <td>
          ${formatCurrency(group.ape)}
        </td>

        <td>
          ${group.visitConversion.toFixed(1)}%
        </td>

        <td>
          ${group.myShare.toFixed(1)}%
        </td>

      </tr>

    `).join("");

}


// ==========================================
// GROUP DATA
// ==========================================

function groupData(data, field) {

  const groups = {};

  data.forEach(rm => {

    const name =
      rm[field] ||
      "Not Available";

    if (!groups[name]) {

      groups[name] = {

        name: name,

        rms: 0,

        appointments: 0,

        visits: 0,

        bookings: 0,

        ape: 0,

        my: 0

      };

    }


    groups[name].rms++;

    groups[name].appointments +=
      rm.appointments;

    groups[name].visits +=
      rm.visits;

    groups[name].bookings +=
      rm.bookings;

    groups[name].ape +=
      rm.ape;

    groups[name].my +=
      rm.my;

  });


  return Object.values(groups)
    .map(group => {

      group.visitPercent =
        calculatePercentage(
          group.visits,
          group.appointments
        );

      group.appointmentConversion =
        calculatePercentage(
          group.bookings,
          group.appointments
        );

      group.visitConversion =
        calculatePercentage(
          group.bookings,
          group.visits
        );

      group.myShare =
        calculatePercentage(
          group.my,
          group.ape
        );

      return group;

    })
    .sort(
      (a, b) =>
        b.ape - a.ape
    );

}


// ==========================================
// INSIGHTS
// ==========================================

function renderInsights() {

  const container =
    document.getElementById(
      "insightsContainer"
    );

  if (!container) return;


  const lowVisit =
    rmData.filter(rm =>
      rm.appointments > 0 &&
      rm.visitPercent < 50
    );


  const lowConversion =
    rmData.filter(rm =>
      rm.visits > 0 &&
      rm.visitConversion < 20
    );


  const highPerformers =
    [...rmData]
      .sort(
        (a, b) =>
          b.ape - a.ape
      )
      .slice(0, 5);


  container.innerHTML = `

    <div class="insight-box">

      <h3>
        Low Visit %
      </h3>

      <p>
        ${lowVisit.length}
        RM(s) have Visit % below 50%.
      </p>

    </div>


    <div class="insight-box">

      <h3>
        Low Conversion
      </h3>

      <p>
        ${lowConversion.length}
        RM(s) have Visit Conversion below 20%.
      </p>

    </div>


    <div class="insight-box">

      <h3>
        Top Performers
      </h3>

      <p>
        ${
          highPerformers
            .map(rm =>
              rm.name ||
              rm.ecode
            )
            .join(", ")
        }
      </p>

    </div>

  `;

}


// ==========================================
// REFRESH BUTTON
// ==========================================

function setupRefreshButton() {

  const button =
    document.getElementById(
      "refreshBtn"
    );

  if (!button) return;

  button.addEventListener(
    "click",
    function () {

      loadGoogleSheetData();

    }
  );

}


// ==========================================
// NAVIGATION
// ==========================================

function setupNavigation() {

  const items =
    document.querySelectorAll(
      ".nav-item"
    );

  items.forEach(item => {

    item.addEventListener(
      "click",
      function () {

        items.forEach(nav =>
          nav.classList.remove("active")
        );

        this.classList.add("active");

      }
    );

  });

}


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculatePercentage(
  numerator,
  denominator
) {

  if (!denominator) return 0;

  return (
    numerator /
    denominator
  ) * 100;

}


function calculateTenure(doj) {

  if (!doj) return 0;

  const joiningDate =
    new Date(doj);

  if (
    isNaN(
      joiningDate.getTime()
    )
  ) {
    return 0;
  }

  const today =
    new Date();

  const difference =
    today -
    joiningDate;

  return Math.floor(
    difference /
    (1000 * 60 * 60 * 24)
  );

}


function formatTenure(days) {

  if (!days) return "-";

  if (days < 30) {
    return days + " Days";
  }

  const months =
    Math.floor(days / 30);

  if (months < 12) {
    return months + " Months";
  }

  const years =
    Math.floor(months / 12);

  const remainingMonths =
    months % 12;

  return (
    years +
    "Y " +
    remainingMonths +
    "M"
  );

}


function formatNumber(value) {

  return Number(value || 0)
    .toLocaleString("en-IN");

}


function formatCurrency(value) {

  value =
    Number(value || 0);

  if (value >= 10000000) {

    return (
      "₹" +
      (value / 10000000)
        .toFixed(2) +
      " Cr"
    );

  }

  if (value >= 100000) {

    return (
      "₹" +
      (value / 100000)
        .toFixed(2) +
      " L"
    );

  }

  return (
    "₹" +
    value.toLocaleString("en-IN")
  );

}


function formatDate(value) {

  if (!value) return "-";

  const date =
    new Date(value);

  if (
    isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );

}


function getFilterValue(id) {

  const element =
    document.getElementById(id);

  if (!element) return "";

  return (
    element.value || ""
  ).trim();

}


function updateElement(
  id,
  value
) {

  const element =
    document.getElementById(id);

  if (element) {

    element.textContent =
      value;

  }

}


function showStatus(message) {

  const status =
    document.getElementById(
      "dataStatus"
    );

  if (status) {

    status.textContent =
      message;

  }

  console.log(message);

}


function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
