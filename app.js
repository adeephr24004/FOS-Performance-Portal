// ==========================================================
// FOS PERFORMANCE PORTAL
// GOOGLE SHEETS CONNECTION
// ==========================================================

const GOOGLE_SHEET_API =
  "https://script.google.com/macros/s/AKfycbx3DH5vcJaP3PjC2PwKsIA_ZwIFoF1gdJ-26gOKrjY6MLaakuyqI7dwSKC7xbNlQw/exec";

let rawData = [];
let filteredData = [];
let currentEmployee = null;


// ==========================================================
// COLUMN NAME DETECTION
// This allows different column naming formats in Google Sheet
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
    "login"
  ],

  name: [
    "name",
    "employee name",
    "rm name",
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
    "tl name"
  ],

  zm: [
    "zm",
    "zonal manager",
    "zone manager",
    "zm name"
  ],

  city: [
    "city"
  ],

  zone: [
    "zone",
    "region"
  ],

  trainer: [
    "trainer",
    "trainer name",
    "name of trainer"
  ],

  tenure: [
    "tenure"
  ],

  appt: [
    "appt",
    "appointment",
    "appointments",
    "total appointment"
  ],

  visit: [
    "visit",
    "visits",
    "total visit"
  ],

  booking: [
    "booking",
    "bookings",
    "total booking"
  ],

  ape: [
    "ape",
    "total ape"
  ],

  date: [
    "date",
    "business date",
    "report date"
  ],

  my: [
    "my",
    "month",
    "month year"
  ]

};


// ==========================================================
// START APPLICATION
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();
  setupFilters();
  setupEmployeeSearch();
  setupGlobalSearch();
  setupRefreshButtons();
  setupDataSearch();

  loadGoogleSheetData();

});


// ==========================================================
// LOAD GOOGLE SHEET DATA
// ==========================================================

async function loadGoogleSheetData() {

  showLoading(true);
  hideError();

  try {

    const response = await fetch(GOOGLE_SHEET_API, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(
        `Server returned error: ${response.status}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error(
        "Google Sheet API did not return an array of records."
      );
    }

    rawData = data
      .map(normalizeRecord)
      .filter(record => Object.keys(record).length > 0);

    filteredData = [...rawData];

    console.log("GOOGLE SHEET DATA:", rawData);

    populateAllFilters();
    updateDashboard();
    updateZoneComparison();
    updateAllDataTable();

    updateLastUpdated();

  } catch (error) {

    console.error(error);

    showError(
      error.message +
      ". Please check the Google Apps Script deployment."
    );

  } finally {

    showLoading(false);

  }

}


// ==========================================================
// NORMALIZE RECORD
// ==========================================================

function normalizeRecord(record) {

  const newRecord = {};

  Object.keys(record).forEach(key => {

    const cleanKey = String(key || "")
      .trim()
      .toLowerCase();

    newRecord[cleanKey] = record[key];

  });

  return newRecord;

}


// ==========================================================
// FIND VALUE USING ALIASES
// ==========================================================

function getField(record, fieldName) {

  const aliases = FIELD_ALIASES[fieldName] || [];

  const keys = Object.keys(record);

  for (const alias of aliases) {

    const foundKey = keys.find(key =>
      normalizeText(key) === normalizeText(alias)
    );

    if (foundKey !== undefined) {

      const value = record[foundKey];

      if (
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {
        return value;
      }

    }

  }

  return "";

}


function normalizeText(value) {

  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ");

}


// ==========================================================
// NUMBER CONVERSION
// ==========================================================

function numberValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  const cleaned = String(value)
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");

  const number = parseFloat(cleaned);

  return isNaN(number) ? 0 : number;

}


// ==========================================================
// FORMAT NUMBER
// ==========================================================

function formatNumber(value) {

  return numberValue(value)
    .toLocaleString("en-IN", {
      maximumFractionDigits: 0
    });

}


function formatAPE(value) {

  const number = numberValue(value);

  if (number >= 10000000) {
    return "₹" + (number / 10000000)
      .toFixed(2) + " Cr";
  }

  if (number >= 100000) {
    return "₹" + (number / 100000)
      .toFixed(2) + " L";
  }

  if (number >= 1000) {
    return "₹" + (number / 1000)
      .toFixed(1) + "K";
  }

  return "₹" + formatNumber(number);

}


function percentage(numerator, denominator) {

  if (numberValue(denominator) === 0) {
    return 0;
  }

  return (
    numberValue(numerator) /
    numberValue(denominator)
  ) * 100;

}


// ==========================================================
// CALCULATE TOTALS
// ==========================================================

function calculateTotals(data) {

  let appt = 0;
  let visit = 0;
  let booking = 0;
  let ape = 0;

  data.forEach(record => {

    appt += numberValue(getField(record, "appt"));
    visit += numberValue(getField(record, "visit"));
    booking += numberValue(getField(record, "booking"));
    ape += numberValue(getField(record, "ape"));

  });

  return {
    appt,
    visit,
    booking,
    ape
  };

}


// ==========================================================
// UNIQUE EMPLOYEE COUNT
// ==========================================================

function uniqueEmployeeCount(data) {

  const employees = new Set();

  data.forEach(record => {

    const code =
      getField(record, "ecode") ||
      getField(record, "username") ||
      getField(record, "name");

    if (code) {
      employees.add(String(code));
    }

  });

  return employees.size;

}


// ==========================================================
// UPDATE DASHBOARD
// ==========================================================

function updateDashboard() {

  const totals = calculateTotals(filteredData);

  const employees =
    uniqueEmployeeCount(filteredData);

  const visitPercent =
    percentage(totals.visit, totals.appt);

  const apptConversion =
    percentage(totals.booking, totals.appt);

  const visitConversion =
    percentage(totals.booking, totals.visit);


  document.getElementById(
    "activeEmployees"
  ).textContent = formatNumber(employees);


  document.getElementById(
    "totalAppt"
  ).textContent = formatNumber(totals.appt);


  document.getElementById(
    "totalVisit"
  ).textContent = formatNumber(totals.visit);


  document.getElementById(
    "totalBooking"
  ).textContent = formatNumber(totals.booking);


  document.getElementById(
    "totalAPE"
  ).textContent = formatAPE(totals.ape);


  document.getElementById(
    "visitPercent"
  ).textContent =
    visitPercent.toFixed(1) +
    "% appointment → visit";


  document.getElementById(
    "apptConversion"
  ).textContent =
    apptConversion.toFixed(1) +
    "% appointment conversion";


  document.getElementById(
    "visitBookingConversion"
  ).textContent =
    visitConversion.toFixed(1) + "%";


  renderZonePerformance();
  renderTopPerformers();

}


// ==========================================================
// GROUP DATA BY EMPLOYEE
// ==========================================================

function groupByEmployee(data) {

  const employees = {};

  data.forEach(record => {

    const id =
      String(
        getField(record, "ecode") ||
        getField(record, "username") ||
        getField(record, "name") ||
        "Unknown"
      );

    if (!employees[id]) {

      employees[id] = {
        id,
        records: [],
        appt: 0,
        visit: 0,
        booking: 0,
        ape: 0,
        details: record
      };

    }

    employees[id].records.push(record);

    employees[id].appt +=
      numberValue(getField(record, "appt"));

    employees[id].visit +=
      numberValue(getField(record, "visit"));

    employees[id].booking +=
      numberValue(getField(record, "booking"));

    employees[id].ape +=
      numberValue(getField(record, "ape"));

  });

  return Object.values(employees);

}


// ==========================================================
// TOP PERFORMERS
// ==========================================================

function renderTopPerformers() {

  const container =
    document.getElementById("topPerformers");

  const employees =
    groupByEmployee(filteredData);

  employees.sort((a, b) => b.ape - a.ape);

  const topEmployees =
    employees.slice(0, 5);

  if (topEmployees.length === 0) {

    container.innerHTML =
      "<p>No performance data available.</p>";

    return;

  }

  container.innerHTML =
    topEmployees.map((employee, index) => {

      const record =
        employee.details;

      const name =
        getField(record, "name") ||
        getField(record, "username") ||
        employee.id;

      const zone =
        getField(record, "zone") || "-";

      const city =
        getField(record, "city") || "";

      return `

        <div class="performer-row">

          <div class="rank">
            ${index + 1}
          </div>

          <div class="performer-info">

            <h4>${escapeHTML(name)}</h4>

            <p>
              ${escapeHTML(zone)}
              ${city ? " • " + escapeHTML(city) : ""}
            </p>

          </div>

          <div class="performer-value">
            ${formatAPE(employee.ape)}
          </div>

        </div>

      `;

    }).join("");

}


// ==========================================================
// ZONE PERFORMANCE
// ==========================================================

function groupByZone(data) {

  const zones = {};

  data.forEach(record => {

    const zone =
      getField(record, "zone") ||
      "Not Assigned";

    if (!zones[zone]) {

      zones[zone] = {
        zone,
        records: [],
        appt: 0,
        visit: 0,
        booking: 0,
        ape: 0
      };

    }

    zones[zone].records.push(record);

    zones[zone].appt +=
      numberValue(getField(record, "appt"));

    zones[zone].visit +=
      numberValue(getField(record, "visit"));

    zones[zone].booking +=
      numberValue(getField(record, "booking"));

    zones[zone].ape +=
      numberValue(getField(record, "ape"));

  });

  return Object.values(zones);

}


function renderZonePerformance() {

  const container =
    document.getElementById("zonePerformance");

  const zones =
    groupByZone(filteredData);

  zones.sort((a, b) => b.ape - a.ape);

  const maxAPE =
    Math.max(...zones.map(zone => zone.ape), 1);

  if (zones.length === 0) {

    container.innerHTML =
      "<p>No zone data available.</p>";

    return;

  }

  container.innerHTML =
    zones.map(zone => {

      const width =
        (zone.ape / maxAPE) * 100;

      return `

        <div class="zone-row">

          <div class="zone-row-top">

            <strong>
              ${escapeHTML(zone.zone)}
            </strong>

            <span>
              ${formatAPE(zone.ape)}
            </span>

          </div>

          <div class="progress-bg">

            <div
              class="progress-fill"
              style="width: ${width}%"
            ></div>

          </div>

        </div>

      `;

    }).join("");

}


// ==========================================================
// ZONE COMPARISON TABLE
// ==========================================================

function updateZoneComparison() {

  const tbody =
    document.getElementById(
      "zoneComparisonTable"
    );

  const zones =
    groupByZone(filteredData);

  zones.sort((a, b) => b.ape - a.ape);

  tbody.innerHTML =
    zones.map(zone => {

      const employeeCount =
        uniqueEmployeeCount(zone.records);

      const visitPercent =
        percentage(
          zone.visit,
          zone.appt
        );

      const apptConversion =
        percentage(
          zone.booking,
          zone.appt
        );

      const visitConversion =
        percentage(
          zone.booking,
          zone.visit
        );

      return `

        <tr>

          <td>
            <strong>
              ${escapeHTML(zone.zone)}
            </strong>
          </td>

          <td>
            ${formatNumber(employeeCount)}
          </td>

          <td>
            ${formatNumber(zone.appt)}
          </td>

          <td>
            ${formatNumber(zone.visit)}
          </td>

          <td>
            ${formatNumber(zone.booking)}
          </td>

          <td>
            ${formatAPE(zone.ape)}
          </td>

          <td>
            ${visitPercent.toFixed(1)}%
          </td>

          <td>
            ${apptConversion.toFixed(1)}%
          </td>

          <td>
            ${visitConversion.toFixed(1)}%
          </td>

        </tr>

      `;

    }).join("");

}


// ==========================================================
// FILTERS
// ==========================================================

function populateAllFilters() {

  populateFilter(
    "zoneFilter",
    getUniqueValues(rawData, "zone")
  );

  populateFilter(
    "cityFilter",
    getUniqueValues(rawData, "city")
  );

  populateFilter(
    "tlFilter",
    getUniqueValues(rawData, "tl")
  );

  populateFilter(
    "zmFilter",
    getUniqueValues(rawData, "zm")
  );

  populateFilter(
    "dataZoneFilter",
    getUniqueValues(rawData, "zone")
  );

}


function getUniqueValues(data, field) {

  const values = new Set();

  data.forEach(record => {

    const value =
      getField(record, field);

    if (value) {
      values.add(String(value));
    }

  });

  return [...values]
    .sort((a, b) =>
      a.localeCompare(b)
    );

}


function populateFilter(
  elementId,
  values
) {

  const select =
    document.getElementById(elementId);

  const currentValue =
    select.value;

  const firstOption =
    select.options[0]
      ? select.options[0].outerHTML
      : "";

  select.innerHTML = firstOption;

  values.forEach(value => {

    const option =
      document.createElement("option");

    option.value = value;
    option.textContent = value;

    select.appendChild(option);

  });

  select.value = currentValue;

}


function setupFilters() {

  const filters = [
    "zoneFilter",
    "cityFilter",
    "tlFilter",
    "zmFilter"
  ];

  filters.forEach(id => {

    document
      .getElementById(id)
      .addEventListener(
        "change",
        applyFilters
      );

  });


  document
    .getElementById("clearFilters")
    .addEventListener("click", () => {

      filters.forEach(id => {
        document
          .getElementById(id)
          .value = "";
      });

      applyFilters();

    });

}


function applyFilters() {

  const zone =
    document
      .getElementById("zoneFilter")
      .value;

  const city =
    document
      .getElementById("cityFilter")
      .value;

  const tl =
    document
      .getElementById("tlFilter")
      .value;

  const zm =
    document
      .getElementById("zmFilter")
      .value;


  filteredData =
    rawData.filter(record => {

      if (
        zone &&
        String(
          getField(record, "zone")
        ) !== zone
      ) {
        return false;
      }

      if (
        city &&
        String(
          getField(record, "city")
        ) !== city
      ) {
        return false;
      }

      if (
        tl &&
        String(
          getField(record, "tl")
        ) !== tl
      ) {
        return false;
      }

      if (
        zm &&
        String(
          getField(record, "zm")
        ) !== zm
      ) {
        return false;
      }

      return true;

    });

  updateDashboard();
  updateZoneComparison();
  updateAllDataTable();

}


// ==========================================================
// EMPLOYEE SEARCH
// ==========================================================

function setupEmployeeSearch() {

  document
    .getElementById(
      "employeeSearchBtn"
    )
    .addEventListener(
      "click",
      searchEmployee
    );


  document
    .getElementById(
      "employeeSearch"
    )
    .addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {
          searchEmployee();
        }

      }
    );

}


function searchEmployee() {

  const search =
    document
      .getElementById(
        "employeeSearch"
      )
      .value
      .trim()
      .toLowerCase();


  if (!search) {
    return;
  }


  const matchingRecords =
    rawData.filter(record => {

      const searchableText = [

        getField(record, "ecode"),

        getField(record, "username"),

        getField(record, "name")

      ]
        .join(" ")
        .toLowerCase();


      return searchableText
        .includes(search);

    });


  if (matchingRecords.length === 0) {

    document
      .getElementById(
        "employeeDetails"
      )
      .classList.add("hidden");


    document
      .getElementById(
        "employeeNotFound"
      )
      .textContent =
        "No employee found with this E-Code, Username or Name.";


    document
      .getElementById(
        "employeeNotFound"
      )
      .classList.remove("hidden");

    return;

  }


  displayEmployee(
    matchingRecords
  );

}


function displayEmployee(records) {

  document
    .getElementById(
      "employeeDetails"
    )
    .classList.remove("hidden");


  document
    .getElementById(
      "employeeNotFound"
    )
    .classList.add("hidden");


  const first =
    records[0];


  const totals =
    calculateTotals(records);


  const name =
    getField(first, "name") ||
    getField(first, "username") ||
    "Employee";


  document
    .getElementById("empName")
    .textContent = name;


  document
    .getElementById("empCode")
    .textContent =
      "E-Code: " +
      (
        getField(first, "ecode") ||
        "-"
      );


  document
    .getElementById("empUsername")
    .textContent =
      getField(first, "username") ||
      "-";


  document
    .getElementById("empDOJ")
    .textContent =
      formatDate(
        getField(first, "doj")
      );


  document
    .getElementById("empTenure")
    .textContent =
      getTenure(
        getField(first, "doj"),
        getField(first, "tenure")
      );


  document
    .getElementById("empTL")
    .textContent =
      getField(first, "tl") ||
      "-";


  document
    .getElementById("empZM")
    .textContent =
      getField(first, "zm") ||
      "-";


  document
    .getElementById("empCity")
    .textContent =
      getField(first, "city") ||
      "-";


  document
    .getElementById("empZone")
    .textContent =
      getField(first, "zone") ||
      "-";


  document
    .getElementById("empTrainer")
    .textContent =
      getField(first, "trainer") ||
      "-";


  document
    .getElementById("empAppt")
    .textContent =
      formatNumber(totals.appt);


  document
    .getElementById("empVisit")
    .textContent =
      formatNumber(totals.visit);


  document
    .getElementById("empBooking")
    .textContent =
      formatNumber(totals.booking);


  document
    .getElementById("empAPE")
    .textContent =
      formatAPE(totals.ape);


  document
    .getElementById("empApptConv")
    .textContent =
      percentage(
        totals.booking,
        totals.appt
      ).toFixed(1) + "%";


  document
    .getElementById("empVisitConv")
    .textContent =
      percentage(
        totals.booking,
        totals.visit
      ).toFixed(1) + "%";


  renderEmployeeDateTable(records);

}


// ==========================================================
// DATE WISE TABLE
// ==========================================================

function renderEmployeeDateTable(records) {

  const tbody =
    document.getElementById(
      "employeeDateTable"
    );


  tbody.innerHTML =
    records.map(record => {

      const appt =
        numberValue(
          getField(record, "appt")
        );

      const visit =
        numberValue(
          getField(record, "visit")
        );

      const booking =
        numberValue(
          getField(record, "booking")
        );

      const ape =
        numberValue(
          getField(record, "ape")
        );

      return `

        <tr>

          <td>
            ${formatDate(
              getField(record, "date")
            ) || "-"}
          </td>

          <td>
            ${formatNumber(appt)}
          </td>

          <td>
            ${formatNumber(visit)}
          </td>

          <td>
            ${formatNumber(booking)}
          </td>

          <td>
            ${formatAPE(ape)}
          </td>

          <td>
            ${percentage(
              booking,
              appt
            ).toFixed(1)}%
          </td>

          <td>
            ${percentage(
              booking,
              visit
            ).toFixed(1)}%
          </td>

        </tr>

      `;

    }).join("");

}


// ==========================================================
// DATE FORMAT
// ==========================================================

function formatDate(value) {

  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    isNaN(date.getTime())
  ) {
    return String(value);
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


// ==========================================================
// TENURE
// ==========================================================

function getTenure(
  doj,
  existingTenure
) {

  if (existingTenure) {
    return existingTenure;
  }

  if (!doj) {
    return "-";
  }

  const joiningDate =
    new Date(doj);

  if (
    isNaN(
      joiningDate.getTime()
    )
  ) {
    return "-";
  }

  const today =
    new Date();

  let months =
    (today.getFullYear() -
      joiningDate.getFullYear()) *
    12;

  months +=
    today.getMonth() -
    joiningDate.getMonth();


  if (months < 0) {
    return "-";
  }

  const years =
    Math.floor(months / 12);

  const remainingMonths =
    months % 12;


  if (years === 0) {
    return remainingMonths + " months";
  }

  return (
    years +
    "y " +
    remainingMonths +
    "m"
  );

}


// ==========================================================
// ALL DATA TABLE
// ==========================================================

function updateAllDataTable() {

  const search =
    document
      .getElementById(
        "tableSearch"
      )?.value
      ?.toLowerCase() || "";


  const selectedZone =
    document
      .getElementById(
        "dataZoneFilter"
      )?.value || "";


  let data =
    [...rawData];


  if (selectedZone) {

    data = data.filter(record =>
      String(
        getField(record, "zone")
      ) === selectedZone
    );

  }


  if (search) {

    data = data.filter(record => {

      const text =
        Object.values(record)
          .join(" ")
          .toLowerCase();

      return text.includes(search);

    });

  }


  const importantFields = [

    {
      label: "E-Code",
      field: "ecode"
    },

    {
      label: "Username",
      field: "username"
    },

    {
      label: "Name",
      field: "name"
    },

    {
      label: "TL",
      field: "tl"
    },

    {
      label: "ZM",
      field: "zm"
    },

    {
      label: "City",
      field: "city"
    },

    {
      label: "Zone",
      field: "zone"
    },

    {
      label: "Trainer",
      field: "trainer"
    },

    {
      label: "Date",
      field: "date"
    },

    {
      label: "Appt",
      field: "appt"
    },

    {
      label: "Visit",
      field: "visit"
    },

    {
      label: "Booking",
      field: "booking"
    },

    {
      label: "APE",
      field: "ape"
    }

  ];


  const thead =
    document.getElementById(
      "allDataHead"
    );


  thead.innerHTML = `

    <tr>

      ${importantFields.map(column => `
        <th>
          ${column.label}
        </th>
      `).join("")}

    </tr>

  `;


  const tbody =
    document.getElementById(
      "allDataBody"
    );


  tbody.innerHTML =
    data.slice(0, 500)
      .map(record => {

        return `

          <tr>

            ${importantFields.map(column => {

              let value =
                getField(
                  record,
                  column.field
                );

              if (
                column.field === "ape"
              ) {
                value =
                  formatAPE(value);
              }

              if (
                column.field === "appt" ||
                column.field === "visit" ||
                column.field === "booking"
              ) {
                value =
                  formatNumber(value);
              }

              if (
                column.field === "date"
              ) {
                value =
                  formatDate(value);
              }

              return `
                <td>
                  ${escapeHTML(
                    String(value || "-")
                  )}
                </td>
              `;

            }).join("")}

          </tr>

        `;

      }).join("");

}


// ==========================================================
// GLOBAL SEARCH
// ==========================================================

function setupGlobalSearch() {

  document
    .getElementById(
      "globalSearch"
    )
    .addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {

          const value =
            event.target.value;

          document
            .querySelector(
              '[data-page="employee"]'
            )
            .click();


          document
            .getElementById(
              "employeeSearch"
            )
            .value = value;


          searchEmployee();

        }

      }
    );

}


// ==========================================================
// DATA SEARCH
// ==========================================================

function setupDataSearch() {

  document
    .getElementById(
      "tableSearch"
    )
    .addEventListener(
      "input",
      updateAllDataTable
    );


  document
    .getElementById(
      "dataZoneFilter"
    )
    .addEventListener(
      "change",
      updateAllDataTable
    );

}


// ==========================================================
// NAVIGATION
// ==========================================================

function setupNavigation() {

  const buttons =
    document.querySelectorAll(
      ".nav-btn"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        buttons.forEach(btn =>
          btn.classList.remove(
            "active"
          )
        );

        button.classList.add(
          "active"
        );


        const page =
          button.dataset.page;


        document
          .querySelectorAll(
            ".page"
          )
          .forEach(section =>
            section.classList.remove(
              "active-page"
            )
          );


        document
          .getElementById(
            page + "Page"
          )
          .classList.add(
            "active-page"
          );


        updatePageHeading(page);

      }
    );

  });

}


function updatePageHeading(page) {

  const title =
    document.getElementById(
      "pageTitle"
    );

  const subtitle =
    document.getElementById(
      "pageSubtitle"
    );


  const headings = {

    dashboard: [
      "Performance Dashboard",
      "Live performance data from Google Sheets"
    ],

    employee: [
      "Employee Performance",
      "Individual employee analysis"
    ],

    comparison: [
      "Zone Comparison",
      "Compare performance across Zones"
    ],

    data: [
      "All Data",
      "Live records from Google Sheets"
    ]

  };


  title.textContent =
    headings[page][0];

  subtitle.textContent =
    headings[page][1];

}


// ==========================================================
// REFRESH BUTTONS
// ==========================================================

function setupRefreshButtons() {

  document
    .getElementById(
      "refreshBtn"
    )
    .addEventListener(
      "click",
      loadGoogleSheetData
    );


  document
    .getElementById(
      "refreshTopBtn"
    )
    .addEventListener(
      "click",
      loadGoogleSheetData
    );

}


// ==========================================================
// LOADING
// ==========================================================

function showLoading(show) {

  const loading =
    document.getElementById(
      "loading"
    );

  if (show) {

    loading.classList.remove(
      "hidden"
    );

  } else {

    loading.classList.add(
      "hidden"
    );

  }

}


// ==========================================================
// ERROR
// ==========================================================

function showError(message) {

  const box =
    document.getElementById(
      "errorBox"
    );

  document
    .getElementById(
      "errorText"
    )
    .textContent = message;


  box.classList.remove(
    "hidden"
  );

}


function hideError() {

  document
    .getElementById(
      "errorBox"
    )
    .classList.add(
      "hidden"
    );

}


// ==========================================================
// LAST UPDATED
// ==========================================================

function updateLastUpdated() {

  const now =
    new Date();

  document
    .getElementById(
      "lastUpdated"
    )
    .textContent =
      "Updated: " +
      now.toLocaleTimeString(
        "en-IN"
      );

}


// ==========================================================
// SAFE HTML
// ==========================================================

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
