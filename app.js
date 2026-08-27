/* =========================================================
   FOS PERFORMANCE PORTAL
   app.js
========================================================= */

let allData = [];
let filteredData = [];
let currentPage = 1;

const rowsPerPage = 15;

let charts = {
  dailyTrend: null,
  zonePerformance: null,
  conversion: null,
  dailyFull: null,
  city: null,
  zoneProductivity: null
};


/* =========================================================
   SAFE DOM HELPERS
========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function on(id, event, callback) {
  const element = getElement(id);

  if (element) {
    element.addEventListener(event, callback);
  }
}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeNavigation();
    initializeEvents();

    createDemoData();

    filteredData = [...allData];

    populateFilters();

    updateDashboard();

  }
);


/* =========================================================
   EVENTS
========================================================= */

function initializeEvents() {

  on(
    "uploadExcelBtn",
    "click",
    () => {
      const input =
        getElement("excelFileInput");

      if (input) {
        input.click();
      }
    }
  );


  on(
    "excelFileInput",
    "change",
    handleExcelUpload
  );


  on(
    "zoneFilter",
    "change",
    applyFilters
  );


  on(
    "cityFilter",
    "change",
    applyFilters
  );


  on(
    "teamFilter",
    "change",
    applyFilters
  );


  on(
    "rmSearch",
    "input",
    applyFilters
  );


  on(
    "clearFiltersButton",
    "click",
    clearFilters
  );


  on(
    "refreshButton",
    "click",
    () => {

      updateDashboard();

      showToast(
        "Dashboard refreshed successfully"
      );

    }
  );


  on(
    "mobileMenuButton",
    "click",
    () => {

      const sidebar =
        document.querySelector(".sidebar");

      if (sidebar) {
        sidebar.classList.toggle("show");
      }

    }
  );


  on(
    "viewLeaderboardButton",
    "click",
    () => {
      navigateToPage("leaderboard");
    }
  );


  on(
    "showFullLeaderboardButton",
    "click",
    () => {
      navigateToPage("leaderboard");
    }
  );


  on(
    "viewTopPerformerButton",
    "click",
    () => {

      const sorted =
        getSortedByAPE(filteredData);

      if (sorted.length > 0) {
        openRMModal(sorted[0]);
      }

    }
  );


  on(
    "closeRmModal",
    "click",
    closeRMModal
  );


  on(
    "rmModal",
    "click",
    (event) => {

      if (
        event.target.id ===
        "rmModal"
      ) {
        closeRMModal();
      }

    }
  );


  on(
    "performanceSearch",
    "input",
    renderPerformanceTable
  );


  on(
    "performanceSort",
    "change",
    renderPerformanceTable
  );


  on(
    "exportDashboardButton",
    "click",
    exportDashboardCSV
  );


  on(
    "exportDataButton",
    "click",
    exportDataCSV
  );

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

  document
    .querySelectorAll(".nav-item")
    .forEach(
      (item) => {

        item.addEventListener(
          "click",
          () => {

            navigateToPage(
              item.dataset.page
            );

          }
        );

      }
    );

}


function navigateToPage(pageName) {

  document
    .querySelectorAll(".nav-item")
    .forEach(
      (item) => {

        item.classList.remove("active");

        if (
          item.dataset.page ===
          pageName
        ) {
          item.classList.add("active");
        }

      }
    );


  document
    .querySelectorAll(".page-section")
    .forEach(
      (page) => {
        page.classList.remove(
          "active-page"
        );
      }
    );


  const target =
    getElement(
      `${pageName}Page`
    );


  if (target) {
    target.classList.add(
      "active-page"
    );
  }


  const titles = {

    dashboard:
      "Performance Dashboard",

    performance:
      "RM Performance",

    leaderboard:
      "FOS Leaderboard",

    funnel:
      "Sales Funnel",

    daily:
      "Daily Tracker",

    team:
      "Team Insights",

    data:
      "Data Explorer"

  };


  setText(
    "pageTitle",
    titles[pageName] ||
    "FOS Performance Portal"
  );


  const sidebar =
    document.querySelector(".sidebar");

  if (sidebar) {
    sidebar.classList.remove("show");
  }


  if (
    pageName === "performance"
  ) {
    renderPerformanceTable();
  }


  if (
    pageName === "leaderboard"
  ) {
    renderFullLeaderboard();
  }

}


/* =========================================================
   EXCEL UPLOAD
========================================================= */

async function handleExcelUpload(event) {

  const file =
    event.target.files[0];

  if (!file) {
    return;
  }


  showLoading(true);


  try {

    if (
      typeof XLSX ===
      "undefined"
    ) {

      throw new Error(
        "Excel library not loaded"
      );

    }


    const arrayBuffer =
      await file.arrayBuffer();


    const workbook =
      XLSX.read(
        arrayBuffer,
        {
          type: "array",
          cellDates: true
        }
      );


    const data =
      extractDataFromWorkbook(
        workbook
      );


    if (
      data.length === 0
    ) {

      throw new Error(
        "No usable data found"
      );

    }


    allData =
      data;


    filteredData =
      [...allData];


    currentPage = 1;


    populateFilters();


    updateDashboard();


    updateDataExplorer();


    setText(
      "dataStatus",
      "Excel Data Loaded"
    );


    setText(
      "dataStatusText",
      file.name
    );


    setText(
      "lastUpdated",
      `Updated: ${new Date().toLocaleString()}`
    );


    showToast(
      `${allData.length} RM records loaded successfully`
    );

  } catch (error) {

    console.error(error);

    showToast(
      "Unable to process this Excel file"
    );

  } finally {

    showLoading(false);

    event.target.value = "";

  }

}


/* =========================================================
   EXCEL DATA EXTRACTION
========================================================= */

function extractDataFromWorkbook(workbook) {

  let bestRows = [];


  workbook.SheetNames.forEach(
    (sheetName) => {

      const sheet =
        workbook.Sheets[sheetName];


      const rows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: "",
            raw: false
          }
        );


      if (
        rows.length >
        bestRows.length
      ) {

        bestRows =
          rows;

      }

    }
  );


  const normalized =
    bestRows
      .map(normalizeRow)
      .filter(
        (row) =>
          row.name ||
          row.ecode
      );


  return mergeDuplicateRMs(
    normalized
  );

}


function normalizeRow(row) {

  const keys = {};


  Object.keys(row).forEach(
    (key) => {

      keys[
        normalizeKey(key)
      ] =
        row[key];

    }
  );


  return {

    name:
      cleanValue(
        firstAvailable(
          keys,
          [
            "username",
            "name",
            "salesagent",
            "user",
            "lastname"
          ]
        )
      ) ||
      "Unknown RM",


    ecode:
      cleanValue(
        firstAvailable(
          keys,
          [
            "ecode",
            "employeeid",
            "employee"
          ]
        )
      ),


    tl:
      cleanValue(
        firstAvailable(
          keys,
          [
            "tl",
            "teamleader",
            "manager"
          ]
        )
      ) ||
      "Unassigned",


    zone:
      cleanValue(
        firstAvailable(
          keys,
          [
            "zone",
            "zoneofcity"
          ]
        )
      ) ||
      "Unassigned",


    city:
      cleanValue(
        firstAvailable(
          keys,
          [
            "city",
            "mastercity"
          ]
        )
      ) ||
      "Unassigned",


    team:
      cleanValue(
        firstAvailable(
          keys,
          [
            "team",
            "usergroupname",
            "group"
          ]
        )
      ) ||
      "Unassigned",


    appointments:
      getNumberFromKeys(
        keys,
        [
          "appointments",
          "appointment",
          "appt",
          "count"
        ]
      ),


    visits:
      getNumberFromKeys(
        keys,
        [
          "visits",
          "visit",
          "visitcount"
        ]
      ),


    bookings:
      getNumberFromKeys(
        keys,
        [
          "bookings",
          "booking",
          "bookingcount",
          "plancount"
        ]
      ),


    ape:
      getNumberFromKeys(
        keys,
        [
          "ape",
          "annualpremium",
          "premium"
        ]
      )

  };

}


function normalizeKey(key) {

  return String(key)
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );

}


function firstAvailable(
  object,
  keys
) {

  for (
    const key of keys
  ) {

    if (
      object[key] !==
      undefined
    ) {

      const value =
        object[key];

      if (
        value !== "" &&
        value !== null
      ) {

        return value;

      }

    }

  }

  return "";

}


function getNumberFromKeys(
  object,
  keys
) {

  for (
    const key of keys
  ) {

    if (
      object[key] !==
      undefined &&
      object[key] !== ""
    ) {

      return toNumber(
        object[key]
      );

    }

  }

  return 0;

}


function cleanValue(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();

}


function toNumber(value) {

  if (
    typeof value ===
    "number"
  ) {
    return value;
  }


  const cleaned =
    String(value || "")
      .replace(
        /[₹,\s]/g,
        ""
      )
      .replace(
        /[^0-9.-]/g,
        ""
      );


  const number =
    Number(cleaned);

  return isNaN(number)
    ? 0
    : number;

}


/* =========================================================
   MERGE DUPLICATES
========================================================= */

function mergeDuplicateRMs(data) {

  const grouped =
    new Map();


  data.forEach(
    (row) => {

      const key =
        row.ecode ||
        `${row.name}-${row.city}`;


      if (
        !grouped.has(key)
      ) {

        grouped.set(
          key,
          { ...row }
        );

      } else {

        const existing =
          grouped.get(key);


        existing.appointments +=
          row.appointments;

        existing.visits +=
          row.visits;

        existing.bookings +=
          row.bookings;

        existing.ape +=
          row.ape;

      }

    }
  );


  return Array.from(
    grouped.values()
  );

}


/* =========================================================
   DEMO DATA
========================================================= */

function createDemoData() {

  const names = [
    "Amit Sharma",
    "Rahul Verma",
    "Priya Singh",
    "Neha Gupta",
    "Rohit Kumar",
    "Anjali Das",
    "Vikas Yadav",
    "Sneha Roy",
    "Arjun Mehta",
    "Pooja Nair",
    "Karan Malhotra",
    "Riya Kapoor",
    "Manish Jain",
    "Shreya Paul",
    "Abhishek Singh",
    "Nisha Sharma",
    "Saurabh Gupta",
    "Kritika Jain",
    "Aakash Verma",
    "Deepak Kumar"
  ];


  const zones = [
    "North",
    "South",
    "East",
    "West",
    "Central"
  ];


  const cities = [
    "Delhi",
    "Gurgaon",
    "Mumbai",
    "Bengaluru",
    "Kolkata",
    "Pune",
    "Chennai",
    "Noida"
  ];


  allData =
    names.map(
      (name, index) => {

        const appointments =
          45 +
          Math.floor(
            Math.random() * 140
          );


        const visits =
          Math.floor(
            appointments *
            (
              0.45 +
              Math.random() * 0.35
            )
          );


        const bookings =
          Math.floor(
            visits *
            (
              0.15 +
              Math.random() * 0.30
            )
          );


        const ape =
          bookings *
          (
            12000 +
            Math.floor(
              Math.random() * 28000
            )
          );


        return {

          name,

          ecode:
            `FOS${1000 + index}`,

          tl:
            `TL ${
              Math.floor(
                index / 5
              ) + 1
            }`,

          zone:
            zones[
              index %
              zones.length
            ],

          city:
            cities[
              index %
              cities.length
            ],

          team:
            `Team ${
              (index % 4) + 1
            }`,

          appointments,
          visits,
          bookings,
          ape

        };

      }
    );

}


/* =========================================================
   FILTERS
========================================================= */

function populateFilters() {

  populateSelect(
    "zoneFilter",
    uniqueValues(
      allData.map(
        (row) =>
          row.zone
      )
    ),
    "All Zones"
  );


  populateSelect(
    "cityFilter",
    uniqueValues(
      allData.map(
        (row) =>
          row.city
      )
    ),
    "All Cities"
  );


  populateSelect(
    "teamFilter",
    uniqueValues(
      allData.map(
        (row) =>
          row.team
      )
    ),
    "All Teams"
  );

}


function populateSelect(
  id,
  values,
  defaultText
) {

  const select =
    getElement(id);

  if (!select) {
    return;
  }


  select.innerHTML =
    `<option value="all">${defaultText}</option>`;


  values
    .sort()
    .forEach(
      (value) => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          value;

        option.textContent =
          value;

        select.appendChild(
          option
        );

      }
    );

}


function uniqueValues(array) {

  return [
    ...new Set(
      array.filter(Boolean)
    )
  ];

}


function applyFilters() {

  const zone =
    getElement("zoneFilter")
      ?.value ||
    "all";


  const city =
    getElement("cityFilter")
      ?.value ||
    "all";


  const team =
    getElement("teamFilter")
      ?.value ||
    "all";


  const search =
    (
      getElement("rmSearch")
        ?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  filteredData =
    allData.filter(
      (row) => {

        const searchable =
          [
            row.name,
            row.ecode,
            row.tl,
            row.city,
            row.zone
          ]
            .join(" ")
            .toLowerCase();


        return (

          (
            zone === "all" ||
            row.zone === zone
          ) &&

          (
            city === "all" ||
            row.city === city
          ) &&

          (
            team === "all" ||
            row.team === team
          ) &&

          (
            !search ||
            searchable.includes(
              search
            )
          )

        );

      }
    );


  currentPage = 1;

  updateDashboard();

}


function clearFilters() {

  [
    "zoneFilter",
    "cityFilter",
    "teamFilter"
  ].forEach(
    (id) => {

      const element =
        getElement(id);

      if (element) {
        element.value = "all";
      }

    }
  );


  const search =
    getElement("rmSearch");

  if (search) {
    search.value = "";
  }


  filteredData =
    [...allData];

  currentPage = 1;

  updateDashboard();

  showToast(
    "Filters cleared"
  );

}


/* =========================================================
   DASHBOARD UPDATE
========================================================= */

function updateDashboard() {

  const metrics =
    calculateMetrics(
      filteredData
    );


  updateKPIs(metrics);

  updateFunnel(metrics);

  renderDailyTrendChart(
    filteredData
  );

  renderZonePerformanceChart(
    filteredData
  );

  renderConversionChart(
    metrics
  );

  renderLeaderboardPreview(
    filteredData
  );

  renderFullLeaderboard();

  renderPerformanceTable();

  renderFunnelPage(
    metrics
  );

  renderDailyPage(
    filteredData
  );

  renderTeamInsights(
    filteredData
  );

  updateTopPerformer(
    filteredData
  );

  updateDataExplorer();

}


/* =========================================================
   METRICS
========================================================= */

function calculateMetrics(data) {

  const totalAppointments =
    sum(data, "appointments");

  const totalVisits =
    sum(data, "visits");

  const totalBookings =
    sum(data, "bookings");

  const totalAPE =
    sum(data, "ape");

  const activeRMs =
    data.length;


  return {

    totalAppointments,

    totalVisits,

    totalBookings,

    totalAPE,

    activeRMs,

    visitRate:
      percentage(
        totalVisits,
        totalAppointments
      ),

    bookingConversion:
      percentage(
        totalBookings,
        totalVisits
      ),

    overallConversion:
      percentage(
        totalBookings,
        totalAppointments
      ),

    avgAppointments:
      activeRMs
        ? totalAppointments /
          activeRMs
        : 0,

    avgTicketSize:
      totalBookings
        ? totalAPE /
          totalBookings
        : 0

  };

}


function sum(data, property) {

  return data.reduce(
    (total, row) =>
      total +
      (
        Number(
          row[property]
        ) || 0
      ),
    0
  );

}


function percentage(
  value,
  total
) {

  if (!total) {
    return 0;
  }

  return (
    value /
    total
  ) * 100;

}


/* =========================================================
   KPI UPDATE
========================================================= */

function updateKPIs(metrics) {

  setText(
    "totalAppointments",
    formatNumber(
      metrics.totalAppointments
    )
  );

  setText(
    "totalVisits",
    formatNumber(
      metrics.totalVisits
    )
  );

  setText(
    "totalBookings",
    formatNumber(
      metrics.totalBookings
    )
  );

  setText(
    "totalAPE",
    formatCurrency(
      metrics.totalAPE
    )
  );

  setText(
    "activeRMs",
    formatNumber(
      metrics.activeRMs
    )
  );

  setText(
    "avgAppointments",
    formatNumber(
      metrics.avgAppointments
    )
  );

  setText(
    "visitRate",
    formatPercent(
      metrics.visitRate
    )
  );

  setText(
    "bookingConversion",
    formatPercent(
      metrics.bookingConversion
    )
  );

  setText(
    "avgTicketSize",
    formatCurrency(
      metrics.avgTicketSize
    )
  );


  const productivity =
    metrics.activeRMs
      ? metrics.totalBookings /
        metrics.activeRMs
      : 0;


  setText(
    "productivityScore",
    `${productivity.toFixed(1)} BKG/RM`
  );

}


/* =========================================================
   FUNNEL
========================================================= */

function updateFunnel(metrics) {

  setText(
    "funnelAppointments",
    formatNumber(
      metrics.totalAppointments
    )
  );

  setText(
    "funnelVisits",
    formatNumber(
      metrics.totalVisits
    )
  );

  setText(
    "funnelBookings",
    formatNumber(
      metrics.totalBookings
    )
  );


  setWidth(
    "funnelAppointmentsBar",
    100
  );

  setWidth(
    "funnelVisitsBar",
    percentage(
      metrics.totalVisits,
      metrics.totalAppointments
    )
  );

  setWidth(
    "funnelBookingsBar",
    percentage(
      metrics.totalBookings,
      metrics.totalAppointments
    )
  );


  setText(
    "appointmentVisitConversion",
    formatPercent(
      percentage(
        metrics.totalVisits,
        metrics.totalAppointments
      )
    )
  );


  setText(
    "visitBookingConversion",
    formatPercent(
      percentage(
        metrics.totalBookings,
        metrics.totalVisits
      )
    )
  );


  setText(
    "overallConversion",
    formatPercent(
      metrics.overallConversion
    )
  );

}


/* =========================================================
   CHARTS
========================================================= */

function destroyChart(name) {

  if (charts[name]) {

    charts[name].destroy();

    charts[name] = null;

  }

}


function renderDailyTrendChart(data) {

  const canvas =
    getElement("dailyTrendChart");

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }


  const trend =
    generateDailyData(data);


  destroyChart(
    "dailyTrend"
  );


  charts.dailyTrend =
    new Chart(
      canvas,
      {

        type: "line",

        data: {

          labels:
            trend.labels,

          datasets: [

            {
              label: "Appointments",
              data: trend.appointments,
              borderColor: "#2563eb",
              backgroundColor:
                "rgba(37,99,235,0.08)",
              tension: 0.4,
              fill: true
            },

            {
              label: "Visits",
              data: trend.visits,
              borderColor: "#8b5cf6",
              tension: 0.4
            },

            {
              label: "Bookings",
              data: trend.bookings,
              borderColor: "#10b981",
              tension: 0.4
            }

          ]

        },

        options: {

          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              position: "bottom"
            }
          },

          scales: {
            x: {
              grid: {
                display: false
              }
            },
            y: {
              beginAtZero: true
            }
          }

        }

      }
    );

}


function renderZonePerformanceChart(data) {

  const canvas =
    getElement(
      "zonePerformanceChart"
    );

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }


  const grouped =
    groupBy(data, "zone");


  const zones =
    Object.keys(grouped);


  const values =
    zones.map(
      (zone) =>
        sum(
          grouped[zone],
          "ape"
        )
    );


  destroyChart(
    "zonePerformance"
  );


  charts.zonePerformance =
    new Chart(
      canvas,
      {

        type: "bar",

        data: {

          labels: zones,

          datasets: [
            {
              label: "APE",
              data: values,
              backgroundColor:
                "#2563eb",
              borderRadius: 7
            }
          ]

        },

        options: {

          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              display: false
            }
          }

        }

      }
    );

}


function renderConversionChart(metrics) {

  const canvas =
    getElement("conversionChart");

  if (
    !canvas ||
    typeof Chart === "undefined"
  ) {
    return;
  }


  destroyChart(
    "conversion"
  );


  charts.conversion =
    new Chart(
      canvas,
      {

        type: "doughnut",

        data: {

          labels: [
            "Converted",
            "Remaining"
          ],

          datasets: [
            {
              data: [
                metrics.overallConversion,
                Math.max(
                  0,
                  100 -
                  metrics.overallConversion
                )
              ],

              backgroundColor: [
                "#10b981",
                "#e5e7eb"
              ],

              borderWidth: 0
            }
          ]

        },

        options: {

          responsive: true,
          maintainAspectRatio: false,

          cutout: "70%",

          plugins: {
            legend: {
              position: "bottom"
            }
          }

        }

      }
    );

}


/* =========================================================
   LEADERBOARD
========================================================= */

function getSortedByAPE(data) {

  return [...data].sort(
    (a, b) =>
      b.ape - a.ape
  );

}


function renderLeaderboardPreview(data) {

  const body =
    getElement(
      "leaderboardPreviewBody"
    );

  if (!body) {
    return;
  }


  const sorted =
    getSortedByAPE(data)
      .slice(0, 8);


  if (
    sorted.length === 0
  ) {

    body.innerHTML = `
      <tr>
        <td colspan="9">
          No performance data found.
        </td>
      </tr>
    `;

    return;

  }


  body.innerHTML =
    sorted
      .map(
        (row, index) =>
          leaderboardRowHTML(
            row,
            index + 1
          )
      )
      .join("");

}


function leaderboardRowHTML(
  row,
  rank
) {

  const conversion =
    percentage(
      row.bookings,
      row.visits
    );


  return `

    <tr>

      <td>
        <span class="
          rank-badge
          ${rank <= 3 ? `rank-${rank}` : ""}
        ">
          ${rank}
        </span>
      </td>

      <td>
        <div class="rm-cell">

          <div class="rm-table-avatar">
            ${getInitials(row.name)}
          </div>

          <div>
            <span class="rm-name">
              ${escapeHTML(row.name)}
            </span>

            <span class="rm-subtext">
              ${escapeHTML(row.ecode || "-")}
            </span>
          </div>

        </div>
      </td>

      <td>${escapeHTML(row.zone)}</td>

      <td>${escapeHTML(row.city)}</td>

      <td>${formatNumber(row.appointments)}</td>

      <td>${formatNumber(row.visits)}</td>

      <td>${formatNumber(row.bookings)}</td>

      <td class="metric-positive">
        ${formatPercent(conversion)}
      </td>

      <td>
        <strong>
          ${formatCurrency(row.ape)}
        </strong>
      </td>

    </tr>

  `;

}


function renderFullLeaderboard() {

  const body =
    getElement(
      "fullLeaderboardBody"
    );

  if (!body) {
    return;
  }


  const sorted =
    getSortedByAPE(
      filteredData
    );


  setText(
    "totalRanked",
    formatNumber(
      sorted.length
    )
  );


  body.innerHTML =
    sorted
      .map(
        (row, index) => `

          <tr>

            <td>
              <span class="
                rank-badge
                ${index < 3 ? `rank-${index + 1}` : ""}
              ">
                ${index + 1}
              </span>
            </td>

            <td>
              <div class="rm-cell">

                <div class="rm-table-avatar">
                  ${getInitials(row.name)}
                </div>

                <div>

                  <span class="rm-name">
                    ${escapeHTML(row.name)}
                  </span>

                  <span class="rm-subtext">
                    ${escapeHTML(row.ecode || "-")}
                  </span>

                </div>

              </div>
            </td>

            <td>${escapeHTML(row.zone)}</td>

            <td>${escapeHTML(row.city)}</td>

            <td>${formatNumber(row.appointments)}</td>

            <td>${formatNumber(row.visits)}</td>

            <td>${formatNumber(row.bookings)}</td>

            <td>
              <strong>
                ${formatCurrency(row.ape)}
              </strong>
            </td>

            <td>
              ${calculateScore(row).toFixed(1)}
            </td>

          </tr>

        `
      )
      .join("");


  updatePodium(sorted);

}


function updatePodium(sorted) {

  const positions = [
    {
      prefix: "first",
      row: sorted[0]
    },
    {
      prefix: "second",
      row: sorted[1]
    },
    {
      prefix: "third",
      row: sorted[2]
    }
  ];


  positions.forEach(
    ({ prefix, row }) => {

      setText(
        `${prefix}Initial`,
        row
          ? getInitials(row.name)
          : "--"
      );

      setText(
        `${prefix}Name`,
        row
          ? row.name
          : "--"
      );

      setText(
        `${prefix}APE`,
        row
          ? formatCurrency(row.ape)
          : "--"
      );

    }
  );

}


/* =========================================================
   PERFORMANCE TABLE
========================================================= */

function renderPerformanceTable() {

  const body =
    getElement(
      "performanceTableBody"
    );

  if (!body) {
    return;
  }


  const search =
    (
      getElement("performanceSearch")
        ?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const sort =
    getElement("performanceSort")
      ?.value ||
    "ape-desc";


  let data =
    filteredData.filter(
      (row) => {

        const text =
          [
            row.name,
            row.ecode,
            row.city,
            row.tl,
            row.zone
          ]
            .join(" ")
            .toLowerCase();


        return (
          !search ||
          text.includes(search)
        );

      }
    );


  data =
    sortPerformanceData(
      data,
      sort
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        data.length /
        rowsPerPage
      )
    );


  if (
    currentPage >
    totalPages
  ) {
    currentPage = totalPages;
  }


  const start =
    (currentPage - 1) *
    rowsPerPage;


  const pageData =
    data.slice(
      start,
      start + rowsPerPage
    );


  body.innerHTML =
    pageData
      .map(
        (row) => {

          const visitRate =
            percentage(
              row.visits,
              row.appointments
            );


          const conversion =
            percentage(
              row.bookings,
              row.visits
            );


          return `

            <tr
              class="clickable-rm"
              data-ecode="${escapeHTML(row.ecode)}"
            >

              <td>
                <div class="rm-cell">

                  <div class="rm-table-avatar">
                    ${getInitials(row.name)}
                  </div>

                  <div>
                    <span class="rm-name">
                      ${escapeHTML(row.name)}
                    </span>

                    <span class="rm-subtext">
                      ${escapeHTML(row.team)}
                    </span>
                  </div>

                </div>
              </td>

              <td>
                ${escapeHTML(row.ecode || "-")}
              </td>

              <td>
                ${escapeHTML(row.tl)}
              </td>

              <td>
                ${escapeHTML(row.zone)}
              </td>

              <td>
                ${escapeHTML(row.city)}
              </td>

              <td>
                ${formatNumber(row.appointments)}
              </td>

              <td>
                ${formatNumber(row.visits)}
              </td>

              <td>
                ${formatNumber(row.bookings)}
              </td>

              <td>
                ${formatPercent(visitRate)}
              </td>

              <td class="metric-positive">
                ${formatPercent(conversion)}
              </td>

              <td>
                <strong>
                  ${formatCurrency(row.ape)}
                </strong>
              </td>

            </tr>

          `;

        }
      )
      .join("");


  document
    .querySelectorAll(".clickable-rm")
    .forEach(
      (element) => {

        element.addEventListener(
          "click",
          () => {

            const ecode =
              element.dataset.ecode;


            const rm =
              filteredData.find(
                (row) =>
                  row.ecode === ecode
              );


            if (rm) {
              openRMModal(rm);
            }

          }
        );

      }
    );


  setText(
    "performanceCount",
    `${data.length} records`
  );


  renderPagination(
    totalPages
  );

}


function sortPerformanceData(
  data,
  sort
) {

  const copy =
    [...data];


  if (
    sort === "booking-desc"
  ) {

    return copy.sort(
      (a, b) =>
        b.bookings -
        a.bookings
    );

  }


  if (
    sort === "conversion-desc"
  ) {

    return copy.sort(
      (a, b) =>
        percentage(
          b.bookings,
          b.visits
        ) -
        percentage(
          a.bookings,
          a.visits
        )
    );

  }


  if (
    sort === "appointments-desc"
  ) {

    return copy.sort(
      (a, b) =>
        b.appointments -
        a.appointments
    );

  }


  return copy.sort(
    (a, b) =>
      b.ape -
      a.ape
  );

}


function renderPagination(totalPages) {

  const container =
    getElement(
      "performancePagination"
    );

  if (!container) {
    return;
  }


  container.innerHTML = "";


  const maxPages =
    Math.min(
      totalPages,
      5
    );


  for (
    let page = 1;
    page <= maxPages;
    page++
  ) {

    const button =
      document.createElement(
        "button"
      );


    button.textContent =
      page;


    if (
      page === currentPage
    ) {
      button.classList.add(
        "active"
      );
    }


    button.addEventListener(
      "click",
      () => {

        currentPage =
          page;

        renderPerformanceTable();

      }
    );


    container.appendChild(
      button
    );

  }

}


/* =========================================================
   FUNNEL PAGE
========================================================= */

function renderFunnelPage(metrics) {

  setText(
    "bigFunnelAppointments",
    formatNumber(
      metrics.totalAppointments
    )
  );

  setText(
    "bigFunnelVisits",
    formatNumber(
      metrics.totalVisits
    )
  );

  setText(
    "bigFunnelBookings",
    formatNumber(
      metrics.totalBookings
    )
  );


  setWidth(
    "bigAppointmentFill",
    100
  );

  setWidth(
    "bigVisitFill",
    percentage(
      metrics.totalVisits,
      metrics.totalAppointments
    )
  );

  setWidth(
    "bigBookingFill",
    percentage(
      metrics.totalBookings,
      metrics.totalAppointments
    )
  );


  renderZoneFunnelTable(
    filteredData
  );

}


function renderZoneFunnelTable(data) {

  const body =
    getElement("zoneFunnelBody");

  if (!body) {
    return;
  }


  const grouped =
    groupBy(data, "zone");


  body.innerHTML =
    Object.entries(grouped)
      .map(
        ([zone, rows]) => {

          const appointments =
            sum(
              rows,
              "appointments"
            );

          const visits =
            sum(
              rows,
              "visits"
            );

          const bookings =
            sum(
              rows,
              "bookings"
            );

          const ape =
            sum(
              rows,
              "ape"
            );


          return `

            <tr>

              <td>
                <strong>
                  ${escapeHTML(zone)}
                </strong>
              </td>

              <td>
                ${formatNumber(appointments)}
              </td>

              <td>
                ${formatNumber(visits)}
              </td>

              <td>
                ${formatNumber(bookings)}
              </td>

              <td>
                ${formatPercent(
                  percentage(
                    visits,
                    appointments
                  )
                )}
              </td>

              <td>
                ${formatPercent(
                  percentage(
                    bookings,
                    visits
                  )
                )}
              </td>

              <td>
                <strong>
                  ${formatCurrency(ape)}
                </strong>
              </td>

            </tr>

          `;

        }
      )
      .join("");

}


/* =========================================================
   DAILY DATA
========================================================= */

function generateDailyData(data) {

  const labels = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun"
  ];


  const weights = [
    0.11,
    0.15,
    0.17,
    0.18,
    0.16,
    0.13,
    0.10
  ];


  const totalAppointments =
    sum(
      data,
      "appointments"
    );


  const totalVisits =
    sum(
      data,
      "visits"
    );


  const totalBookings =
    sum(
      data,
      "bookings"
    );


  return {

    labels,

    appointments:
      weights.map(
        (weight) =>
          Math.round(
            totalAppointments *
            weight
          )
      ),

    visits:
      weights.map(
        (weight) =>
          Math.round(
            totalVisits *
            weight
          )
      ),

    bookings:
      weights.map(
        (weight) =>
          Math.round(
            totalBookings *
            weight
          )
      )

  };

}


function renderDailyPage(data) {

  const trend =
    generateDailyData(data);


  const canvas =
    getElement(
      "dailyFullChart"
    );


  if (
    canvas &&
    typeof Chart !==
    "undefined"
  ) {

    destroyChart(
      "dailyFull"
    );


    charts.dailyFull =
      new Chart(
        canvas,
        {

          type: "bar",

          data: {

            labels:
              trend.labels,

            datasets: [

              {
                label:
                  "Appointments",
                data:
                  trend.appointments,
                backgroundColor:
                  "#2563eb"
              },

              {
                label:
                  "Visits",
                data:
                  trend.visits,
                backgroundColor:
                  "#8b5cf6"
              },

              {
                label:
                  "Bookings",
                data:
                  trend.bookings,
                backgroundColor:
                  "#10b981"
              }

            ]

          },

          options: {
            responsive: true,
            maintainAspectRatio: false
          }

        }
      );

  }


  const body =
    getElement(
      "dailyTableBody"
    );


  if (!body) {
    return;
  }


  body.innerHTML =
    trend.labels
      .map(
        (day, index) => `

          <tr>

            <td>
              <strong>${day}</strong>
            </td>

            <td>
              ${formatNumber(
                trend.appointments[index]
              )}
            </td>

            <td>
              ${formatNumber(
                trend.visits[index]
              )}
            </td>

            <td>
              ${formatNumber(
                trend.bookings[index]
              )}
            </td>

            <td>
              ${formatPercent(
                percentage(
                  trend.visits[index],
                  trend.appointments[index]
                )
              )}
            </td>

            <td>
              ${formatPercent(
                percentage(
                  trend.bookings[index],
                  trend.visits[index]
                )
              )}
            </td>

          </tr>

        `
      )
      .join("");

}


/* =========================================================
   TEAM INSIGHTS
========================================================= */

function renderTeamInsights(data) {

  renderCityChart(data);

  renderZoneProductivityChart(data);


  const body =
    getElement(
      "teamInsightsBody"
    );

  if (!body) {
    return;
  }


  const grouped =
    groupBy(data, "zone");


  body.innerHTML =
    Object.entries(grouped)
      .map(
        ([zone, rows]) => `

          <tr>

            <td>
              <strong>
                ${escapeHTML(zone)}
              </strong>
            </td>

            <td>
              ${formatNumber(rows.length)}
            </td>

            <td>
              ${formatNumber(
                sum(
                  rows,
                  "appointments"
                )
              )}
            </td>

            <td>
              ${formatNumber(
                sum(
                  rows,
                  "visits"
                )
              )}
            </td>

            <td>
              ${formatNumber(
                sum(
                  rows,
                  "bookings"
                )
              )}
            </td>

            <td>
              ${formatCurrency(
                sum(
                  rows,
                  "ape"
                )
              )}
            </td>

          </tr>

        `
      )
      .join("");

}


function renderCityChart(data) {

  const canvas =
    getElement("cityChart");

  if (
    !canvas ||
    typeof Chart ===
    "undefined"
  ) {
    return;
  }


  const grouped =
    groupBy(data, "city");


  const cities =
    Object.keys(grouped);


  const values =
    cities.map(
      (city) =>
        sum(
          grouped[city],
          "ape"
        )
    );


  destroyChart("city");


  charts.city =
    new Chart(
      canvas,
      {

        type: "bar",

        data: {

          labels: cities,

          datasets: [
            {
              label: "APE",
              data: values,
              backgroundColor:
                "#8b5cf6",
              borderRadius: 7
            }
          ]

        },

        options: {

          indexAxis: "y",

          responsive: true,

          maintainAspectRatio: false

        }

      }
    );

}


function renderZoneProductivityChart(data) {

  const canvas =
    getElement(
      "zoneProductivityChart"
    );

  if (
    !canvas ||
    typeof Chart ===
    "undefined"
  ) {
    return;
  }


  const grouped =
    groupBy(data, "zone");


  const zones =
    Object.keys(grouped);


  const productivity =
    zones.map(
      (zone) => {

        const rows =
          grouped[zone];

        return (
          sum(
            rows,
            "bookings"
          ) /
          Math.max(
            1,
            rows.length
          )
        );

      }
    );


  destroyChart(
    "zoneProductivity"
  );


  charts.zoneProductivity =
    new Chart(
      canvas,
      {

        type: "radar",

        data: {

          labels: zones,

          datasets: [
            {
              label:
                "Bookings per RM",

              data:
                productivity,

              borderColor:
                "#2563eb",

              backgroundColor:
                "rgba(37,99,235,0.15)"
            }
          ]

        },

        options: {
          responsive: true,
          maintainAspectRatio: false
        }

      }
    );

}


/* =========================================================
   TOP PERFORMER
========================================================= */

function updateTopPerformer(data) {

  const top =
    getSortedByAPE(data)[0];


  if (!top) {
    return;
  }


  setText(
    "topPerformerInitial",
    getInitials(top.name)
  );

  setText(
    "topPerformerName",
    top.name
  );

  setText(
    "topPerformerMeta",
    `${top.city} • ${top.zone}`
  );

  setText(
    "topPerformerAPE",
    formatCurrency(top.ape)
  );

  setText(
    "topPerformerBookings",
    formatNumber(top.bookings)
  );

}


/* =========================================================
   DATA EXPLORER
========================================================= */

function updateDataExplorer() {

  const body =
    getElement(
      "dataExplorerBody"
    );

  if (!body) {
    return;
  }


  body.innerHTML =
    filteredData
      .slice(0, 100)
      .map(
        (row) => `

          <tr>

            <td>
              ${escapeHTML(row.name)}
            </td>

            <td>
              ${escapeHTML(row.ecode || "-")}
            </td>

            <td>
              ${escapeHTML(row.tl)}
            </td>

            <td>
              ${escapeHTML(row.zone)}
            </td>

            <td>
              ${escapeHTML(row.city)}
            </td>

            <td>
              ${escapeHTML(row.team)}
            </td>

            <td>
              ${formatNumber(row.appointments)}
            </td>

            <td>
              ${formatNumber(row.visits)}
            </td>

            <td>
              ${formatNumber(row.bookings)}
            </td>

            <td>
              ${formatCurrency(row.ape)}
            </td>

          </tr>

        `
      )
      .join("");

}


/* =========================================================
   RM MODAL
========================================================= */

function openRMModal(row) {

  const sorted =
    getSortedByAPE(
      filteredData
    );


  const rank =
    sorted.findIndex(
      (item) =>
        item.ecode ===
        row.ecode
    ) + 1;


  setText(
    "modalInitial",
    getInitials(row.name)
  );

  setText(
    "modalName",
    row.name
  );

  setText(
    "modalMeta",
    `${row.ecode || "No ECODE"} • ${row.city} • ${row.zone}`
  );

  setText(
    "modalAppointments",
    formatNumber(row.appointments)
  );

  setText(
    "modalVisits",
    formatNumber(row.visits)
  );

  setText(
    "modalBookings",
    formatNumber(row.bookings)
  );

  setText(
    "modalAPE",
    formatCurrency(row.ape)
  );

  setText(
    "modalVisitRate",
    formatPercent(
      percentage(
        row.visits,
        row.appointments
      )
    )
  );

  setText(
    "modalConversion",
    formatPercent(
      percentage(
        row.bookings,
        row.visits
      )
    )
  );

  setText(
    "modalRank",
    rank > 0
      ? `#${rank}`
      : "--"
  );


  const modal =
    getElement("rmModal");

  if (modal) {
    modal.classList.add("show");
  }

}


function closeRMModal() {

  const modal =
    getElement("rmModal");

  if (modal) {
    modal.classList.remove("show");
  }

}


/* =========================================================
   EXPORT CSV
========================================================= */

function exportDashboardCSV() {

  const metrics =
    calculateMetrics(
      filteredData
    );


  const rows = [

    [
      "Metric",
      "Value"
    ],

    [
      "Total Appointments",
      metrics.totalAppointments
    ],

    [
      "Total Visits",
      metrics.totalVisits
    ],

    [
      "Total Bookings",
      metrics.totalBookings
    ],

    [
      "Total APE",
      metrics.totalAPE
    ],

    [
      "Active FOS",
      metrics.activeRMs
    ]

  ];


  downloadCSV(
    rows,
    "FOS-Dashboard-Summary.csv"
  );

}


function exportDataCSV() {

  const rows = [

    [
      "RM Name",
      "ECODE",
      "TL",
      "Zone",
      "City",
      "Team",
      "Appointments",
      "Visits",
      "Bookings",
      "APE"
    ],

    ...filteredData.map(
      (row) => [

        row.name,
        row.ecode,
        row.tl,
        row.zone,
        row.city,
        row.team,
        row.appointments,
        row.visits,
        row.bookings,
        row.ape

      ]
    )

  ];


  downloadCSV(
    rows,
    "FOS-Performance-Data.csv"
  );

}


function downloadCSV(
  rows,
  fileName
) {

  const csv =
    rows
      .map(
        (row) =>
          row
            .map(
              (value) =>
                `"${String(value).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(",")
      )
      .join("\n");


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  link.href = url;

  link.download = fileName;


  document.body.appendChild(
    link
  );


  link.click();


  document.body.removeChild(
    link
  );


  URL.revokeObjectURL(
    url
  );


  showToast(
    "Export completed successfully"
  );

}


/* =========================================================
   GENERAL HELPERS
========================================================= */

function groupBy(data, key) {

  return data.reduce(
    (grouped, item) => {

      const value =
        item[key] ||
        "Unassigned";


      if (
        !grouped[value]
      ) {
        grouped[value] = [];
      }


      grouped[value].push(
        item
      );


      return grouped;

    },
    {}
  );

}


function calculateScore(row) {

  const conversion =
    percentage(
      row.bookings,
      row.visits
    );


  return (
    row.bookings * 2 +
    conversion +
    row.ape / 100000
  );

}


function setText(id, value) {

  const element =
    getElement(id);

  if (element) {
    element.textContent = value;
  }

}


function setWidth(id, value) {

  const element =
    getElement(id);

  if (element) {

    const safeValue =
      Math.min(
        100,
        Math.max(
          0,
          value
        )
      );


    element.style.width =
      `${safeValue}%`;

  }

}


function formatNumber(value) {

  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits: 0
    }
  ).format(
    Number(value) || 0
  );

}


function formatCurrency(value) {

  const number =
    Number(value) || 0;


  if (
    Math.abs(number) >=
    10000000
  ) {

    return `₹${(
      number / 10000000
    ).toFixed(2)} Cr`;

  }


  if (
    Math.abs(number) >=
    100000
  ) {

    return `₹${(
      number / 100000
    ).toFixed(2)} L`;

  }


  if (
    Math.abs(number) >=
    1000
  ) {

    return `₹${(
      number / 1000
    ).toFixed(1)}K`;

  }


  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }
  ).format(number);

}


function formatPercent(value) {

  return `${(
    Number(value) || 0
  ).toFixed(1)}%`;

}


function getInitials(name) {

  if (!name) {
    return "--";
  }


  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase()
    )
    .join("");

}


function escapeHTML(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function showLoading(show) {

  const overlay =
    getElement(
      "loadingOverlay"
    );

  if (overlay) {
    overlay.classList.toggle(
      "show",
      show
    );
  }

}


let toastTimer;


function showToast(message) {

  const toast =
    getElement("toast");

  const toastMessage =
    getElement("toastMessage");


  if (
    !toast ||
    !toastMessage
  ) {
    return;
  }


  toastMessage.textContent =
    message;


  toast.classList.add("show");


  clearTimeout(toastTimer);


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3000
    );

}
