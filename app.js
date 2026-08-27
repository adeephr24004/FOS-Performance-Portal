/* =========================================================
   FOS PERFORMANCE PORTAL
   LIVE DATA SOURCE: GOOGLE APPS SCRIPT
========================================================= */

const DATA_URL =
  "https://script.google.com/macros/s/AKfycbz2o4YTcDYfub2I8HqdKO1vp4VvKZxj1ozzJubPr7YXN_6XHgcVF6n3tZL2CQ3cZI8/exec";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let allData = [];
let headers = [];
let filteredData = [];

let charts = {
  performance: null,
  topPerformers: null,
  daily: null,
  analytics: null
};


/* =========================================================
   IMPORTANT COLUMN NAMES
========================================================= */

const PRIORITY_COLUMNS = [
  "ECODE",
  "Userid",
  "UserName",
  "IsActive",
  "DOJ",
  "TL",
  "ZM",
  "Team",
  "City",
  "Zone",
  "Region",
  "Tenure",
  "Vintage",
  "Source",
  "Trainer",
  "Conv on App",
  "Conv On Visit",
  "Visit%",
  "Leads",
  "Visits",
  "Bookings",
  "APE",
  "Weighted APE",
  "MY",
  "APE FY 25-26",
  "Achievers",
  "Contest APE",
  "Will Qualify",
  "Current DRR",
  "DRR (For Dubai)",
  "Projection",
  "Batch Alpha"
];

const FILTER_CANDIDATES = [
  "Trainer",
  "TL",
  "ZM",
  "Team",
  "City",
  "Zone",
  "Region",
  "Vintage",
  "Source",
  "IsActive",
  "Batch Alpha"
];


/* =========================================================
   START APPLICATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();

  setupButtons();

  setupSearch();

  setupDailyMetric();

  setupAnalyticsParameter();

  loadData();

});


/* =========================================================
   LOAD LIVE DATA
========================================================= */

async function loadData() {

  showLoading(true);

  try {

    const response = await fetch(
      DATA_URL + "?t=" + Date.now(),
      {
        method: "GET",
        cache: "no-store"
      }
    );


    if (!response.ok) {

      throw new Error(
        "Unable to load live data"
      );

    }


    const result = await response.json();


    /* -----------------------------------------
       HANDLE DIFFERENT POSSIBLE API FORMATS
    ----------------------------------------- */

    let rawData;


    if (Array.isArray(result)) {

      rawData = result;

    } else if (result.data) {

      rawData = result.data;

    } else if (result.values) {

      rawData = result.values;

    } else {

      rawData = [];

    }


    if (!rawData || rawData.length === 0) {

      throw new Error(
        "No data found in RM Tracker FOS"
      );

    }


    /* -----------------------------------------
       CONVERT DATA INTO OBJECTS
    ----------------------------------------- */

    const processed = processData(
      rawData
    );


    allData = processed.rows;

    headers = processed.headers;

    filteredData = [...allData];


    /* -----------------------------------------
       BUILD APPLICATION
    ----------------------------------------- */

    buildFilters();

    buildDashboard();

    buildEmployeeTable();

    buildAnalyticsParameters();

    buildParameterList();


    updateLastUpdated();


    showToast(
      "Live data loaded successfully",
      "✓"
    );


  } catch (error) {

    console.error(error);


    document.getElementById(
      "dataStatus"
    ).textContent =
      "● Data Error";


    showToast(
      "Could not load live data",
      "!"
    );


    console.error(
      "DATA ERROR:",
      error
    );

  } finally {

    showLoading(false);

  }

}


/* =========================================================
   PROCESS DATA
========================================================= */

function processData(rawData) {


  /* -----------------------------------------
     CASE 1:
     API ALREADY RETURNS OBJECTS
  ----------------------------------------- */

  if (
    rawData.length > 0 &&
    typeof rawData[0] === "object" &&
    !Array.isArray(rawData[0])
  ) {

    const allHeaders = [];


    rawData.forEach(row => {

      Object.keys(row).forEach(key => {

        if (!allHeaders.includes(key)) {

          allHeaders.push(key);

        }

      });

    });


    return {

      headers: makeUniqueHeaders(
        allHeaders
      ),

      rows: rawData.map((row, index) => {

        const newRow = {};


        allHeaders.forEach((header, i) => {

          const uniqueHeader =
            makeUniqueHeaders(
              allHeaders
            )[i];


          newRow[uniqueHeader] =
            row[header];

        });


        newRow.__rowIndex = index;

        return newRow;

      })

    };

  }


  /* -----------------------------------------
     CASE 2:
     API RETURNS ARRAY OF ARRAYS
  ----------------------------------------- */

  let headerRowIndex =
    findHeaderRow(rawData);


  const rawHeaders =
    rawData[headerRowIndex];


  const uniqueHeaders =
    makeUniqueHeaders(
      rawHeaders
    );


  const rows =
    rawData
      .slice(headerRowIndex + 1)
      .filter(row => {

        return row.some(cell =>
          cell !== "" &&
          cell !== null &&
          cell !== undefined
        );

      })
      .map((row, index) => {

        const obj = {};


        uniqueHeaders.forEach(
          (header, columnIndex) => {

            obj[header] =
              row[columnIndex] ?? "";

          }
        );


        obj.__rowIndex = index;

        return obj;

      });


  return {

    headers: uniqueHeaders,

    rows: rows

  };

}


/* =========================================================
   FIND HEADER ROW
========================================================= */

function findHeaderRow(data) {

  const possibleHeaders = [
    "ECODE",
    "Userid",
    "UserName",
    "Trainer"
  ];


  for (
    let rowIndex = 0;
    rowIndex < Math.min(data.length, 10);
    rowIndex++
  ) {

    const row = data[rowIndex]
      .map(value =>
        String(value)
          .trim()
      );


    const matches =
      possibleHeaders.filter(header =>
        row.includes(header)
      ).length;


    if (matches >= 2) {

      return rowIndex;

    }

  }


  return 0;

}


/* =========================================================
   MAKE DUPLICATE HEADERS UNIQUE
========================================================= */

function makeUniqueHeaders(rawHeaders) {

  const count = {};


  return rawHeaders.map(
    (header, index) => {

      let name =
        String(header ?? "")
          .trim();


      if (!name) {

        name =
          "Column " +
          (index + 1);

      }


      if (!count[name]) {

        count[name] = 1;

        return name;

      }


      count[name]++;


      return (
        name +
        " (" +
        count[name] +
        ")"
      );

    }
  );

}


/* =========================================================
   FILTER DATA
========================================================= */

function buildFilters() {

  const container =
    document.getElementById(
      "dynamicFilters"
    );


  container.innerHTML = "";


  const availableFilters =
    FILTER_CANDIDATES.filter(
      column =>
        headers.includes(column)
    );


  availableFilters.forEach(column => {

    const values =
      [...new Set(
        allData
          .map(row =>
            cleanValue(
              row[column]
            )
          )
          .filter(value =>
            value !== ""
          )
      )]
      .sort();


    if (values.length === 0) {

      return;

    }


    const group =
      document.createElement("div");


    group.className =
      "filter-group";


    const label =
      document.createElement("label");


    label.textContent =
      column;


    const select =
      document.createElement("select");


    select.dataset.column =
      column;


    const allOption =
      document.createElement("option");


    allOption.value = "";

    allOption.textContent =
      "All " +
      column;


    select.appendChild(
      allOption
    );


    values.forEach(value => {

      const option =
        document.createElement("option");


      option.value =
        value;


      option.textContent =
        value;


      select.appendChild(
        option
      );

    });


    select.addEventListener(
      "change",
      applyFilters
    );


    group.appendChild(
      label
    );


    group.appendChild(
      select
    );


    container.appendChild(
      group
    );

  });

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

  const selects =
    document.querySelectorAll(
      "#dynamicFilters select"
    );


  filteredData =
    allData.filter(row => {


      for (const select of selects) {

        const column =
          select.dataset.column;


        const selectedValue =
          select.value;


        if (
          selectedValue &&
          cleanValue(
            row[column]
          ) !== selectedValue
        ) {

          return false;

        }

      }


      return true;

    });


  refreshAllViews();

}


/* =========================================================
   CLEAR FILTERS
========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.id ===
      "clearFilters"
    ) {

      document
        .querySelectorAll(
          "#dynamicFilters select"
        )
        .forEach(select => {

          select.value = "";

        });


      filteredData =
        [...allData];


      refreshAllViews();

    }

  }
);


/* =========================================================
   REFRESH ALL VIEWS
========================================================= */

function refreshAllViews() {

  buildDashboard();

  buildEmployeeTable();

  buildAnalyticsParameters();

  buildParameterList();

}


/* =========================================================
   DASHBOARD
========================================================= */

function buildDashboard() {

  buildKPICards();

  buildPerformanceChart();

  buildTopPerformersChart();

  buildDailyChart();

  buildTopTable();

}


/* =========================================================
   KPI CARDS
========================================================= */

function buildKPICards() {

  const container =
    document.getElementById(
      "kpiCards"
    );


  container.innerHTML = "";


  const cards = [];


  /* TOTAL MEMBERS */

  cards.push({

    label:
      "Total Members",

    value:
      filteredData.length,

    subtext:
      "Current records"

  });


  /* ACTIVE MEMBERS */

  if (
    headers.includes(
      "IsActive"
    )
  ) {

    const activeCount =
      filteredData.filter(row => {

        const value =
          cleanValue(
            row["IsActive"]
          )
            .toLowerCase();


        return (
          value === "true" ||
          value === "yes" ||
          value === "active" ||
          value === "1"
        );

      }).length;


    cards.push({

      label:
        "Active Members",

      value:
        activeCount,

      subtext:
        "Based on IsActive"

    });

  }


  /* IMPORTANT NUMERIC KPIS */

  const preferredKPIs = [

    "Leads",

    "Visits",

    "Bookings",

    "APE",

    "Weighted APE",

    "Projection"

  ];


  preferredKPIs.forEach(column => {

    if (
      headers.includes(column)
    ) {

      const total =
        sumColumn(
          filteredData,
          column
        );


      cards.push({

        label:
          column,

        value:
          formatNumber(
            total
          ),

        subtext:
          "Filtered total"

      });

    }

  });


  cards
    .slice(0, 8)
    .forEach(card => {

      const element =
        document.createElement("div");


      element.className =
        "kpi-card";


      element.innerHTML = `

        <div class="kpi-label">

          ${escapeHTML(card.label)}

        </div>

        <div class="kpi-value">

          ${escapeHTML(
            String(card.value)
          )}

        </div>

        <div class="kpi-subtext">

          ${escapeHTML(
            card.subtext
          )}

        </div>

      `;


      container.appendChild(
        element
      );

    });

}


/* =========================================================
   PERFORMANCE CHART
========================================================= */

function buildPerformanceChart() {

  const canvas =
    document.getElementById(
      "performanceChart"
    );


  if (!canvas) {

    return;

  }


  if (
    charts.performance
  ) {

    charts.performance.destroy();

  }


  const labels = [];

  const values = [];


  const chartColumns = [

    "Leads",

    "Visits",

    "Bookings",

    "APE"

  ];


  chartColumns.forEach(column => {

    if (
      headers.includes(column)
    ) {

      labels.push(
        column
      );


      values.push(
        sumColumn(
          filteredData,
          column
        )
      );

    }

  });


  charts.performance =
    new Chart(
      canvas,
      {

        type: "bar",

        data: {

          labels: labels,

          datasets: [

            {

              label:
                "Performance",

              data: values,

              borderWidth: 1,

              borderRadius: 6

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


/* =========================================================
   TOP PERFORMERS CHART
========================================================= */

function buildTopPerformersChart() {

  const canvas =
    document.getElementById(
      "topPerformersChart"
    );


  if (!canvas) {

    return;

  }


  if (
    charts.topPerformers
  ) {

    charts.topPerformers.destroy();

  }


  const nameColumn =
    findColumn([
      "UserName",
      "Userid",
      "ECODE"
    ]);


  const valueColumn =
    findColumn([
      "APE",
      "Weighted APE",
      "Bookings",
      "Visits"
    ]);


  if (
    !nameColumn ||
    !valueColumn
  ) {

    return;

  }


  const topRows =
    [...filteredData]
      .sort(
        (a, b) =>
          parseNumber(
            b[valueColumn]
          ) -
          parseNumber(
            a[valueColumn]
          )
      )
      .slice(0, 10);


  charts.topPerformers =
    new Chart(
      canvas,
      {

        type: "bar",

        data: {

          labels:
            topRows.map(row =>
              truncateText(
                cleanValue(
                  row[nameColumn]
                ),
                18
              )
            ),

          datasets: [

            {

              label:
                valueColumn,

              data:
                topRows.map(row =>
                  parseNumber(
                    row[valueColumn]
                  )
                ),

              borderRadius: 6

            }

          ]

        },

        options: {

          indexAxis: "y",

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


/* =========================================================
   DAILY DATE GROUPS
========================================================= */

function getDailyGroups() {

  const dateColumns =
    headers.filter(header =>
      isDateHeader(
        header
      )
    );


  /*
     The sheet has four repeated
     date groups:

     1 = Appointment
     2 = Visit
     3 = Booking
     4 = APE
  */


  const groups = {

    Appointment: [],

    Visit: [],

    Booking: [],

    APE: []

  };


  const groupNames =
    Object.keys(groups);


  dateColumns.forEach(
    (header, index) => {

      const groupIndex =
        Math.floor(
          index / 31
        );


      if (
        groupNames[
          groupIndex
        ]
      ) {

        groups[
          groupNames[
            groupIndex
          ]
        ].push(header);

      }

    }
  );


  return groups;

}


/* =========================================================
   DAILY CHART
========================================================= */

function buildDailyChart() {

  const canvas =
    document.getElementById(
      "dailyChart"
    );


  if (!canvas) {

    return;

  }


  if (
    charts.daily
  ) {

    charts.daily.destroy();

  }


  const metric =
    document.getElementById(
      "dailyMetric"
    ).value;


  const groups =
    getDailyGroups();


  const columns =
    groups[metric] || [];


  const labels =
    columns.map(header =>
      cleanDateLabel(
        header
      )
    );


  const values =
    columns.map(column =>
      sumColumn(
        filteredData,
        column
      )
    );


  charts.daily =
    new Chart(
      canvas,
      {

        type: "line",

        data: {

          labels: labels,

          datasets: [

            {

              label:
                metric,

              data: values,

              tension: 0.35,

              fill: false,

              borderWidth: 3,

              pointRadius: 3

            }

          ]

        },

        options: {

          responsive: true,

          maintainAspectRatio: false,

          interaction: {

            intersect: false,

            mode: "index"

          }

        }

      }
    );

}


/* =========================================================
   TOP PERFORMANCE TABLE
========================================================= */

function buildTopTable() {

  const tbody =
    document.querySelector(
      "#topTable tbody"
    );


  if (!tbody) {

    return;

  }


  tbody.innerHTML = "";


  const rows =
    [...filteredData]
      .sort(
        (a, b) =>
          parseNumber(
            b["APE"]
          ) -
          parseNumber(
            a["APE"]
          )
      )
      .slice(0, 15);


  rows.forEach(row => {

    const tr =
      document.createElement("tr");


    const columns = [

      "ECODE",

      "UserName",

      "Trainer",

      "Visits",

      "Bookings",

      "APE",

      "Projection"

    ];


    columns.forEach(column => {

      const td =
        document.createElement("td");


      td.textContent =
        formatCellValue(
          row[column]
        );


      tr.appendChild(
        td
      );

    });


    tbody.appendChild(
      tr
    );

  });

}


/* =========================================================
   EMPLOYEE TABLE
========================================================= */

function buildEmployeeTable(
  searchText = ""
) {

  const table =
    document.getElementById(
      "employeeTable"
    );


  const thead =
    table.querySelector(
      "thead"
    );


  const tbody =
    table.querySelector(
      "tbody"
    );


  thead.innerHTML = "";

  tbody.innerHTML = "";


  const visibleHeaders =
    headers.filter(header =>
      header !==
      "__rowIndex"
    );


  /* LIMIT VERY LARGE TABLE HEADER RENDER */

  const displayHeaders =
    visibleHeaders;


  const headerRow =
    document.createElement("tr");


  displayHeaders.forEach(header => {

    const th =
      document.createElement("th");


    th.textContent =
      header;


    headerRow.appendChild(
      th
    );

  });


  thead.appendChild(
    headerRow
  );


  let rows =
    filteredData;


  if (searchText) {

    const query =
      searchText
        .toLowerCase();


    rows =
      rows.filter(row => {

        return displayHeaders.some(
          header =>
            cleanValue(
              row[header]
            )
              .toLowerCase()
              .includes(query)
        );

      });

  }


  document.getElementById(
    "employeeCount"
  ).textContent =
    rows.length +
    " records";


  const fragment =
    document.createDocumentFragment();


  rows.forEach(row => {

    const tr =
      document.createElement("tr");


    displayHeaders.forEach(header => {

      const td =
        document.createElement("td");


      td.textContent =
        formatCellValue(
          row[header]
        );


      tr.appendChild(
        td
      );

    });


    fragment.appendChild(
      tr
    );

  });


  tbody.appendChild(
    fragment
  );

}


/* =========================================================
   ANALYTICS PARAMETERS
========================================================= */

function buildAnalyticsParameters() {

  const select =
    document.getElementById(
      "analyticsParameter"
    );


  const currentValue =
    select.value;


  select.innerHTML = "";


  const numericColumns =
    headers.filter(column => {

      if (
        column ===
        "__rowIndex"
      ) {

        return false;

      }


      return isNumericColumn(
        column
      );

    });


  numericColumns.forEach(column => {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      column;


    option.textContent =
      column;


    select.appendChild(
      option
    );

  });


  if (
    numericColumns.includes(
      currentValue
    )
  ) {

    select.value =
      currentValue;

  }


  buildAnalyticsChart();

}


/* =========================================================
   ANALYTICS CHART
========================================================= */

function buildAnalyticsChart() {

  const canvas =
    document.getElementById(
      "analyticsChart"
    );


  const select =
    document.getElementById(
      "analyticsParameter"
    );


  if (
    !canvas ||
    !select ||
    !select.value
  ) {

    return;

  }


  const parameter =
    select.value;


  document.getElementById(
    "analyticsTitle"
  ).textContent =
    parameter +
    " Analysis";


  if (
    charts.analytics
  ) {

    charts.analytics.destroy();

  }


  const nameColumn =
    findColumn([
      "UserName",
      "ECODE",
      "Userid"
    ]);


  const topRows =
    [...filteredData]
      .sort(
        (a, b) =>
          parseNumber(
            b[parameter]
          ) -
          parseNumber(
            a[parameter]
          )
      )
      .slice(0, 20);


  charts.analytics =
    new Chart(
      canvas,
      {

        type: "bar",

        data: {

          labels:
            topRows.map(row =>
              truncateText(
                cleanValue(
                  row[nameColumn]
                ),
                20
              )
            ),

          datasets: [

            {

              label:
                parameter,

              data:
                topRows.map(row =>
                  parseNumber(
                    row[parameter]
                  )
                ),

              borderRadius: 5

            }

          ]

        },

        options: {

          responsive: true,

          maintainAspectRatio: true

        }

      }
    );


  buildAnalyticsSummary(
    parameter
  );

}


/* =========================================================
   ANALYTICS SUMMARY
========================================================= */

function buildAnalyticsSummary(
  parameter
) {

  const container =
    document.getElementById(
      "analyticsSummary"
    );


  const values =
    filteredData
      .map(row =>
        parseNumber(
          row[parameter]
        )
      );


  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    );


  const average =
    values.length
      ? total /
        values.length
      : 0;


  const maximum =
    values.length
      ? Math.max(
          ...values
        )
      : 0;


  const minimum =
    values.length
      ? Math.min(
          ...values
        )
      : 0;


  const items = [

    {

      label:
        "Total",

      value:
        formatNumber(
          total
        )

    },

    {

      label:
        "Average",

      value:
        formatNumber(
          average
        )

    },

    {

      label:
        "Maximum",

      value:
        formatNumber(
          maximum
        )

    },

    {

      label:
        "Minimum",

      value:
        formatNumber(
          minimum
        )

    }

  ];


  container.innerHTML =
    items.map(item => `

      <div class="summary-box">

        <span>

          ${escapeHTML(
            item.label
          )}

        </span>

        <strong>

          ${escapeHTML(
            String(
              item.value
            )
          )}

        </strong>

      </div>

    `).join("");

}


/* =========================================================
   ALL PARAMETERS
========================================================= */

function buildParameterList(
  searchText = ""
) {

  const container =
    document.getElementById(
      "parameterList"
    );


  container.innerHTML = "";


  const query =
    searchText
      .toLowerCase();


  headers
    .filter(header =>
      header !==
      "__rowIndex"
    )
    .filter(header =>
      header
        .toLowerCase()
        .includes(query)
    )
    .forEach(header => {

      const nonEmpty =
        filteredData.filter(row =>
          cleanValue(
            row[header]
          ) !== ""
        ).length;


      const item =
        document.createElement("div");


      item.className =
        "parameter-item";


      item.innerHTML = `

        <h4>

          ${escapeHTML(
            header
          )}

        </h4>

        <p>

          ${nonEmpty} populated records

        </p>

      `;


      container.appendChild(
        item
      );

    });

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

  const employeeSearch =
    document.getElementById(
      "employeeSearch"
    );


  employeeSearch.addEventListener(
    "input",
    event => {

      buildEmployeeTable(
        event.target.value
      );

    }
  );


  const parameterSearch =
    document.getElementById(
      "parameterSearch"
    );


  parameterSearch.addEventListener(
    "input",
    event => {

      buildParameterList(
        event.target.value
      );

    }
  );

}


/* =========================================================
   DAILY METRIC EVENT
========================================================= */

function setupDailyMetric() {

  document
    .getElementById(
      "dailyMetric"
    )
    .addEventListener(
      "change",
      buildDailyChart
    );

}


/* =========================================================
   ANALYTICS EVENT
========================================================= */

function setupAnalyticsParameter() {

  document
    .getElementById(
      "analyticsParameter"
    )
    .addEventListener(
      "change",
      buildAnalyticsChart
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

  const buttons =
    document.querySelectorAll(
      ".nav-item"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        buttons.forEach(item =>
          item.classList.remove(
            "active"
          )
        );


        button.classList.add(
          "active"
        );


        const section =
          button.dataset.section;


        document
          .querySelectorAll(
            ".content-section"
          )
          .forEach(item =>
            item.classList.remove(
              "active-section"
            )
          );


        document
          .getElementById(
            section
          )
          .classList.add(
            "active-section"
          );


        const titles = {

          dashboard:
            "FOS Performance Dashboard",

          employees:
            "FOS Directory",

          analytics:
            "Performance Analytics",

          data:
            "All Parameters"

        };


        document.getElementById(
          "pageTitle"
        ).textContent =
          titles[section];

      }
    );

  });

}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {

  document
    .getElementById(
      "refreshBtn"
    )
    .addEventListener(
      "click",
      () => {

        loadData();

      }
    );

}


/* =========================================================
   HELPERS
========================================================= */

function cleanValue(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(
    value
  ).trim();

}


function parseNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return 0;

  }


  if (
    typeof value ===
    "number"
  ) {

    return isNaN(value)
      ? 0
      : value;

  }


  const cleaned =
    String(value)
      .replace(
        /,/g,
        ""
      )
      .replace(
        /₹/g,
        ""
      )
      .replace(
        /%/g,
        ""
      )
      .trim();


  const number =
    parseFloat(
      cleaned
    );


  return isNaN(number)
    ? 0
    : number;

}


function sumColumn(
  rows,
  column
) {

  return rows.reduce(
    (sum, row) =>
      sum +
      parseNumber(
        row[column]
      ),
    0
  );

}


function formatNumber(value) {

  const number =
    parseNumber(value);


  if (
    Math.abs(number) >=
    10000000
  ) {

    return (
      number /
      10000000
    ).toFixed(2) +
    " Cr";

  }


  if (
    Math.abs(number) >=
    100000
  ) {

    return (
      number /
      100000
    ).toFixed(2) +
    " L";

  }


  if (
    Math.abs(number) >=
    1000
  ) {

    return number.toLocaleString(
      "en-IN",
      {

        maximumFractionDigits: 2

      }
    );

  }


  return number.toLocaleString(
    "en-IN",
    {

      maximumFractionDigits: 2

    }
  );

}


function formatCellValue(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "-";

  }


  return String(value);

}


function findColumn(candidates) {

  for (
    const candidate of candidates
  ) {

    if (
      headers.includes(
        candidate
      )
    ) {

      return candidate;

    }

  }


  return null;

}


function isNumericColumn(column) {

  const sample =
    filteredData
      .slice(0, 50)
      .map(row =>
        row[column]
      )
      .filter(value =>
        cleanValue(value) !== ""
      );


  if (
    sample.length === 0
  ) {

    return false;

  }


  const numericCount =
    sample.filter(value => {

      const text =
        cleanValue(value)
          .replace(
            /,/g,
            ""
          )
          .replace(
            /₹/g,
            ""
          )
          .replace(
            /%/g,
            ""
          );


      return (
        text !== "" &&
        !isNaN(
          parseFloat(text)
        )
      );

    }).length;


  return (
    numericCount /
    sample.length
  ) >= 0.7;

}


function isDateHeader(header) {

  /*
     Supports:
     1-8-2026
     01-08-2026
     1/8/2026
  */


  const clean =
    String(header)
      .replace(
        /\s*\(\d+\)$/,
        ""
      );


  return (
    /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/
  ).test(
    clean
  );

}


function cleanDateLabel(header) {

  return String(header)
    .replace(
      /\s*\(\d+\)$/,
      ""
    );

}


function truncateText(
  text,
  length
) {

  const value =
    cleanValue(text);


  if (
    value.length <=
    length
  ) {

    return value;

  }


  return (
    value.slice(
      0,
      length
    ) +
    "..."
  );

}


function escapeHTML(value) {

  return String(value)
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


/* =========================================================
   LOADING SCREEN
========================================================= */

function showLoading(show) {

  const loading =
    document.getElementById(
      "loadingScreen"
    );


  const app =
    document.getElementById(
      "app"
    );


  if (show) {

    loading.classList.remove(
      "hidden"
    );


    app.classList.add(
      "hidden"
    );

  } else {

    loading.classList.add(
      "hidden"
    );


    app.classList.remove(
      "hidden"
    );

  }

}


/* =========================================================
   LAST UPDATED
========================================================= */

function updateLastUpdated() {

  const now =
    new Date();


  document.getElementById(
    "lastUpdated"
  ).textContent =
    "Updated: " +
    now.toLocaleString();

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  icon = "✓"
) {

  const toast =
    document.getElementById(
      "toast"
    );


  document.getElementById(
    "toastMessage"
  ).textContent =
    message;


  document.getElementById(
    "toastIcon"
  ).textContent =
    icon;


  toast.classList.add(
    "show"
  );


  setTimeout(
    () => {

      toast.classList.remove(
        "show"
      );

    },
    3000
  );

}
