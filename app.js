/* =========================================
   FOS PERFORMANCE INTELLIGENCE PORTAL
   GOOGLE SHEETS DATA ENGINE
========================================= */


// =========================================
// GOOGLE APPS SCRIPT WEB APP URL
// =========================================

const GOOGLE_SHEET_API =
   "https://script.google.com/macros/s/AKfycbxj4T2tfxd_O0Tg84RnqGkS4XBjOurS1hKeJv8fFkFPGwj5D2huFJth8r51IyEeU0E/exec";


// =========================================
// GLOBAL DATA
// =========================================

let allData = [];
let filteredData = [];
let rmSummaryData = [];


// =========================================
// COLUMN NAME ALIASES
// The website automatically tries to identify
// your Google Sheet columns.
// =========================================

const COLUMN_ALIASES = {

    date: [
        "date",
        "booking date",
        "visit date",
        "appointment date"
    ],

    ecode: [
        "e-code",
        "ecode",
        "e code",
        "employee code",
        "employee id"
    ],

    username: [
        "username",
        "user name",
        "user"
    ],

    name: [
        "rm name",
        "name",
        "employee name",
        "rm"
    ],

    doj: [
        "doj",
        "date of joining",
        "joining date"
    ],

    tl: [
        "tl",
        "tl name",
        "team leader",
        "teamleader"
    ],

    zm: [
        "zm",
        "zm name",
        "zonal manager",
        "zone manager"
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

    appointments: [
        "appointments",
        "appointment",
        "appt",
        "total appointments"
    ],

    visits: [
        "visits",
        "visit",
        "total visits"
    ],

    bookings: [
        "bookings",
        "booking",
        "total bookings"
    ],

    ape: [
        "ape",
        "total ape"
    ],

    my: [
        "my",
        "multi year",
        "multi-year",
        "my business"
    ],

    ats: [
        "ats",
        "average ticket size"
    ]

};


// =========================================
// START APPLICATION
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    initialiseApp
);


function initialiseApp() {

    setupNavigation();

    setupFilters();

    setupButtons();

    loadGoogleSheetData();

}


// =========================================
// LOAD GOOGLE SHEET DATA
// =========================================

async function loadGoogleSheetData() {

    showLoading(true);

    setConnectionStatus(
        "Connecting...",
        "loading"
    );


    try {

        const response =
            await fetch(
                GOOGLE_SHEET_API,
                {
                    method: "GET",
                    redirect: "follow"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to connect to Google Sheets"
            );

        }


        const text =
            await response.text();


        let data;


        try {

            data = JSON.parse(text);

        } catch (error) {

            throw new Error(
                "The Google Apps Script did not return JSON data."
            );

        }


        // Sometimes Apps Script returns
        // { data: [...] }

        if (
            data &&
            !Array.isArray(data) &&
            Array.isArray(data.data)
        ) {

            data = data.data;

        }


        if (!Array.isArray(data)) {

            throw new Error(
                "Google Sheet data format is incorrect."
            );

        }


        allData =
            data.map(normaliseRow);


        filteredData =
            [...allData];


        populateFilters();

        applyFilters();


        setConnectionStatus(
            "Connected",
            "connected"
        );


        updateLastUpdated();


    } catch (error) {

        console.error(
            "Google Sheet Error:",
            error
        );


        setConnectionStatus(
            "Connection Failed",
            "error"
        );


        showConnectionError(
            error.message
        );


    } finally {

        showLoading(false);

    }

}


// =========================================
// NORMALISE GOOGLE SHEET ROW
// =========================================

function normaliseRow(row) {

    return {

        raw: row,


        date:
            getColumnValue(
                row,
                COLUMN_ALIASES.date
            ),


        ecode:
            getColumnValue(
                row,
                COLUMN_ALIASES.ecode
            ),


        username:
            getColumnValue(
                row,
                COLUMN_ALIASES.username
            ),


        name:
            getColumnValue(
                row,
                COLUMN_ALIASES.name
            ),


        doj:
            getColumnValue(
                row,
                COLUMN_ALIASES.doj
            ),


        tl:
            getColumnValue(
                row,
                COLUMN_ALIASES.tl
            ),


        zm:
            getColumnValue(
                row,
                COLUMN_ALIASES.zm
            ),


        city:
            getColumnValue(
                row,
                COLUMN_ALIASES.city
            ),


        zone:
            getColumnValue(
                row,
                COLUMN_ALIASES.zone
            ),


        trainer:
            getColumnValue(
                row,
                COLUMN_ALIASES.trainer
            ),


        appointments:
            toNumber(
                getColumnValue(
                    row,
                    COLUMN_ALIASES.appointments
                )
            ),


        visits:
            toNumber(
                getColumnValue(
                    row,
                    COLUMN_ALIASES.visits
                )
            ),


        bookings:
            toNumber(
                getColumnValue(
                    row,
                    COLUMN_ALIASES.bookings
                )
            ),


        ape:
            toNumber(
                getColumnValue(
                    row,
                    COLUMN_ALIASES.ape
                )
            ),


        my:
            toNumber(
                getColumnValue(
                    row,
                    COLUMN_ALIASES.my
                )
            ),


        ats:
            toNumber(
                getColumnValue(
                    row,
                    COLUMN_ALIASES.ats
                )
            )

    };

}


// =========================================
// FIND COLUMN VALUE
// =========================================

function getColumnValue(
    row,
    aliases
) {

    if (!row) {
        return "";
    }


    const keys =
        Object.keys(row);


    for (
        const alias of aliases
    ) {

        const aliasClean =
            cleanColumnName(alias);


        const exactKey =
            keys.find(
                key =>
                    cleanColumnName(key) ===
                    aliasClean
            );


        if (
            exactKey !== undefined
        ) {

            return row[exactKey];

        }

    }


    // Partial match

    for (
        const alias of aliases
    ) {

        const aliasClean =
            cleanColumnName(alias);


        const partialKey =
            keys.find(
                key =>
                    cleanColumnName(key)
                        .includes(aliasClean) ||
                    aliasClean.includes(
                        cleanColumnName(key)
                    )
            );


        if (
            partialKey !== undefined
        ) {

            return row[partialKey];

        }

    }


    return "";

}


function cleanColumnName(value) {

    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[_\-]/g, " ")
        .replace(/\s+/g, " ");

}


// =========================================
// NUMBER CONVERSION
// =========================================

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
            .replace(/₹/g, "")
            .replace(/,/g, "")
            .replace(/%/g, "")
            .replace(/lakh/gi, "")
            .replace(/lakhs/gi, "")
            .trim();


    const number =
        Number(cleaned);


    return isNaN(number)
        ? 0
        : number;

}


// =========================================
// DATE CONVERSION
// =========================================

function parseDate(value) {

    if (!value) {
        return null;
    }


    const date =
        new Date(value);


    if (isNaN(date.getTime())) {
        return null;
    }


    return date;

}


// =========================================
// SETUP NAVIGATION
// =========================================

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(item => {

        item.addEventListener(
            "click",
            function () {

                const page =
                    this.dataset.page;


                showPage(page);

            }
        );

    });

}


function showPage(pageName) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove(
                "active-page"
            );

        });


    const selectedPage =
        document.getElementById(
            pageName
        );


    if (selectedPage) {

        selectedPage.classList.add(
            "active-page"
        );

    }


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove(
                "active"
            );

        });


    const activeNav =
        document.querySelector(
            `.nav-item[data-page="${pageName}"]`
        );


    if (activeNav) {

        activeNav.classList.add(
            "active"
        );

    }


    const pageTitles = {

        dashboard:
            "Performance Dashboard",

        rm:
            "RM Performance Tracker",

        zone:
            "Zone-wise Comparison",

        trainer:
            "Trainer, TL & ZM Analysis",

        insights:
            "Root Cause Analysis",

        data:
            "Data Explorer"

    };


    document.getElementById(
        "pageTitle"
    ).textContent =
        pageTitles[pageName] ||
        "FOS Performance Portal";

}


// =========================================
// FILTER SETUP
// =========================================

function setupFilters() {

    const filterIds = [

        "globalSearch",

        "dateFrom",

        "dateTo",

        "zoneFilter",

        "cityFilter",

        "zmFilter",

        "tlFilter",

        "trainerFilter",

        "tenureFilter"

    ];


    filterIds.forEach(id => {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        element.addEventListener(
            "input",
            applyFilters
        );


        element.addEventListener(
            "change",
            applyFilters
        );

    });


    const metric =
        document.getElementById(
            "topPerformerMetric"
        );


    if (metric) {

        metric.addEventListener(
            "change",
            renderTopPerformers
        );

    }


    document
        .getElementById(
            "clearFiltersBtn"
        )
        ?.addEventListener(
            "click",
            clearFilters
        );

}


// =========================================
// BUTTON SETUP
// =========================================

function setupButtons() {

    document
        .getElementById(
            "refreshBtn"
        )
        ?.addEventListener(
            "click",
            loadGoogleSheetData
        );


    document
        .getElementById(
            "closeModalBtn"
        )
        ?.addEventListener(
            "click",
            closeRMModal
        );


    document
        .querySelector(
            ".modal-backdrop"
        )
        ?.addEventListener(
            "click",
            closeRMModal
        );

}


// =========================================
// POPULATE FILTER DROPDOWNS
// =========================================

function populateFilters() {

    populateSelect(
        "zoneFilter",
        allData.map(row => row.zone),
        "All Zones"
    );


    populateSelect(
        "cityFilter",
        allData.map(row => row.city),
        "All Cities"
    );


    populateSelect(
        "zmFilter",
        allData.map(row => row.zm),
        "All ZMs"
    );


    populateSelect(
        "tlFilter",
        allData.map(row => row.tl),
        "All TLs"
    );


    populateSelect(
        "trainerFilter",
        allData.map(row => row.trainer),
        "All Trainers"
    );

}


function populateSelect(
    id,
    values,
    defaultText
) {

    const select =
        document.getElementById(id);


    if (!select) {
        return;
    }


    const currentValue =
        select.value;


    const uniqueValues =
        [...new Set(
            values
                .filter(
                    value =>
                        value !== "" &&
                        value !== null &&
                        value !== undefined
                )
                .map(
                    value =>
                        String(value).trim()
                )
        )]
        .sort();


    select.innerHTML =
        `<option value="">${defaultText}</option>`;


    uniqueValues.forEach(value => {

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

    });


    select.value =
        currentValue;

}


// =========================================
// APPLY FILTERS
// =========================================

function applyFilters() {

    const search =
        getInputValue(
            "globalSearch"
        )
        .toLowerCase();


    const dateFrom =
        getInputValue(
            "dateFrom"
        );


    const dateTo =
        getInputValue(
            "dateTo"
        );


    const zone =
        getInputValue(
            "zoneFilter"
        );


    const city =
        getInputValue(
            "cityFilter"
        );


    const zm =
        getInputValue(
            "zmFilter"
        );


    const tl =
        getInputValue(
            "tlFilter"
        );


    const trainer =
        getInputValue(
            "trainerFilter"
        );


    const tenure =
        getInputValue(
            "tenureFilter"
        );


    filteredData =
        allData.filter(row => {


            // SEARCH

            const searchText =
                [
                    row.ecode,
                    row.username,
                    row.name
                ]
                .join(" ")
                .toLowerCase();


            if (
                search &&
                !searchText.includes(
                    search
                )
            ) {

                return false;

            }


            // ZONE

            if (
                zone &&
                row.zone !== zone
            ) {

                return false;

            }


            // CITY

            if (
                city &&
                row.city !== city
            ) {

                return false;

            }


            // ZM

            if (
                zm &&
                row.zm !== zm
            ) {

                return false;

            }


            // TL

            if (
                tl &&
                row.tl !== tl
            ) {

                return false;

            }


            // TRAINER

            if (
                trainer &&
                row.trainer !== trainer
            ) {

                return false;

            }


            // DATE

            if (
                dateFrom ||
                dateTo
            ) {

                const rowDate =
                    parseDate(
                        row.date
                    );


                if (!rowDate) {

                    return false;

                }


                if (dateFrom) {

                    const from =
                        new Date(
                            dateFrom
                        );


                    if (
                        rowDate < from
                    ) {

                        return false;

                    }

                }


                if (dateTo) {

                    const to =
                        new Date(
                            dateTo
                        );


                    to.setHours(
                        23,
                        59,
                        59,
                        999
                    );


                    if (
                        rowDate > to
                    ) {

                        return false;

                    }

                }

            }


            // TENURE

            if (tenure) {

                const days =
                    calculateTenureDays(
                        row.doj
                    );


                if (
                    !matchesTenure(
                        days,
                        tenure
                    )
                ) {

                    return false;

                }

            }


            return true;

        });


    renderEverything();

}


// =========================================
// CLEAR FILTERS
// =========================================

function clearFilters() {

    [

        "globalSearch",

        "dateFrom",

        "dateTo",

        "zoneFilter",

        "cityFilter",

        "zmFilter",

        "tlFilter",

        "trainerFilter",

        "tenureFilter"

    ].forEach(id => {

        const element =
            document.getElementById(id);


        if (element) {

            element.value = "";

        }

    });


    applyFilters();

}


// =========================================
// GET INPUT VALUE
// =========================================

function getInputValue(id) {

    return (
        document.getElementById(id)
            ?.value ||
        ""
    )
    .trim();

}


// =========================================
// RENDER EVERYTHING
// =========================================

function renderEverything() {

    rmSummaryData =
        createRMSummary(
            filteredData
        );


    renderDashboard();

    renderRMTable();

    renderZoneComparison();

    renderTrainerAnalysis();

    renderInsights();

    renderRawData();

}


// =========================================
// CREATE RM SUMMARY
// Multiple date-wise rows are combined
// into one RM performance record.
// =========================================

function createRMSummary(data) {

    const groups =
        {};


    data.forEach(row => {


        const key =
            row.ecode ||
            row.username ||
            row.name ||
            "Unknown";


        if (!groups[key]) {

            groups[key] = {

                ecode:
                    row.ecode,

                username:
                    row.username,

                name:
                    row.name,

                doj:
                    row.doj,

                tl:
                    row.tl,

                zm:
                    row.zm,

                city:
                    row.city,

                zone:
                    row.zone,

                trainer:
                    row.trainer,

                appointments: 0,

                visits: 0,

                bookings: 0,

                ape: 0,

                my: 0,

                ats: 0,

                rows: []

            };

        }


        const rm =
            groups[key];


        // Keep profile information

        [
            "ecode",
            "username",
            "name",
            "doj",
            "tl",
            "zm",
            "city",
            "zone",
            "trainer"
        ]
        .forEach(field => {

            if (
                !rm[field] &&
                row[field]
            ) {

                rm[field] =
                    row[field];

            }

        });


        rm.appointments +=
            row.appointments;


        rm.visits +=
            row.visits;


        rm.bookings +=
            row.bookings;


        rm.ape +=
            row.ape;


        rm.my +=
            row.my;


        rm.ats +=
            row.ats;


        rm.rows.push(row);


    });


    return Object.values(
        groups
    )
    .map(rm => {

        rm.tenureDays =
            calculateTenureDays(
                rm.doj
            );


        rm.tenure =
            formatTenure(
                rm.tenureDays
            );


        rm.visitPercent =
            percentage(
                rm.visits,
                rm.appointments
            );


        rm.appointmentConversion =
            percentage(
                rm.bookings,
                rm.appointments
            );


        rm.visitConversion =
            percentage(
                rm.bookings,
                rm.visits
            );


        rm.myShare =
            percentage(
                rm.my,
                rm.ape
            );


        return rm;

    });

}


// =========================================
// DASHBOARD
// =========================================

function renderDashboard() {

    const totals =
        calculateTotals(
            rmSummaryData
        );


    setText(
        "kpiActiveRMs",
        totals.rms
    );


    setText(
        "kpiAppointments",
        formatNumber(
            totals.appointments
        )
    );


    setText(
        "kpiVisits",
        formatNumber(
            totals.visits
        )
    );


    setText(
        "kpiBookings",
        formatNumber(
            totals.bookings
        )
    );


    setText(
        "kpiAPE",
        formatCurrency(
            totals.ape
        )
    );


    setText(
        "kpiMYShare",
        totals.myShare.toFixed(1) + "%"
    );


    setText(
        "kpiAppointmentVisit",
        "Visit %: " +
        totals.visitPercent.toFixed(1) +
        "%"
    );


    setText(
        "kpiVisitConversion",
        "Visit Conversion: " +
        totals.visitConversion.toFixed(1) +
        "%"
    );


    setText(
        "kpiAppointmentConversion",
        "Appointment Conversion: " +
        totals.appointmentConversion.toFixed(1) +
        "%"
    );


    setText(
        "kpiMYValue",
        "MY: " +
        formatCurrency(
            totals.my
        )
    );


    // FUNNEL

    setText(
        "funnelAppointments",
        formatNumber(
            totals.appointments
        )
    );


    setText(
        "funnelVisits",
        formatNumber(
            totals.visits
        )
    );


    setText(
        "funnelBookings",
        formatNumber(
            totals.bookings
        )
    );


    const max =
        Math.max(
            totals.appointments,
            totals.visits,
            totals.bookings,
            1
        );


    setWidth(
        "funnelAppointmentBar",
        (totals.appointments / max) * 100
    );


    setWidth(
        "funnelVisitBar",
        (totals.visits / max) * 100
    );


    setWidth(
        "funnelBookingBar",
        (totals.bookings / max) * 100
    );


    renderQuickInsights(
        totals
    );


    renderTopPerformers();

    renderZoneSnapshot();

}


// =========================================
// TOTAL CALCULATIONS
// =========================================

function calculateTotals(data) {

    const totals = {

        rms:
            data.length,

        appointments: 0,

        visits: 0,

        bookings: 0,

        ape: 0,

        my: 0

    };


    data.forEach(row => {

        totals.appointments +=
            row.appointments || 0;


        totals.visits +=
            row.visits || 0;


        totals.bookings +=
            row.bookings || 0;


        totals.ape +=
            row.ape || 0;


        totals.my +=
            row.my || 0;

    });


    totals.visitPercent =
        percentage(
            totals.visits,
            totals.appointments
        );


    totals.appointmentConversion =
        percentage(
            totals.bookings,
            totals.appointments
        );


    totals.visitConversion =
        percentage(
            totals.bookings,
            totals.visits
        );


    totals.myShare =
        percentage(
            totals.my,
            totals.ape
        );


    return totals;

}


// =========================================
// QUICK INSIGHTS
// =========================================

function renderQuickInsights(totals) {

    const container =
        document.getElementById(
            "quickInsights"
        );


    if (!container) {
        return;
    }


    const insights =
        [];


    if (
        totals.appointments > 0
    ) {

        if (
            totals.visitPercent < 50
        ) {

            insights.push({

                type:
                    "danger",

                title:
                    "Low Visit Conversion",

                text:
                    `Only ${totals.visitPercent.toFixed(1)}% of appointments are converting into visits.`

            });

        } else {

            insights.push({

                type:
                    "success",

                title:
                    "Appointment to Visit",

                text:
                    `${totals.visitPercent.toFixed(1)}% of appointments converted into visits.`

            });

        }

    }


    if (
        totals.visits > 0
    ) {

        insights.push({

            type:
                totals.visitConversion >= 30
                    ? "success"
                    : "warning",

            title:
                "Visit to Booking Conversion",

            text:
                `${totals.visitConversion.toFixed(1)}% of visits converted into bookings.`

        });

    }


    if (
        totals.ape > 0
    ) {

        insights.push({

            type:
                totals.myShare >= 50
                    ? "success"
                    : "warning",

            title:
                "MY Contribution",

            text:
                `MY contributes ${totals.myShare.toFixed(1)}% of the total APE.`

        });

    }


    if (
        rmSummaryData.length > 0
    ) {

        const top =
            [...rmSummaryData]
            .sort(
                (a, b) =>
                    b.ape - a.ape
            )[0];


        insights.push({

            type:
                "normal",

            title:
                "Highest APE",

            text:
                `${top.name || top.username || top.ecode} is currently leading by APE.`

        });

    }


    container.innerHTML =
        insights.length
            ? insights.map(insight => `

                <div class="insight-item ${insight.type}">

                    <strong>
                        ${escapeHTML(insight.title)}
                    </strong>

                    <p>
                        ${escapeHTML(insight.text)}
                    </p>

                </div>

            `).join("")
            : `<div class="empty-state">
                    No data available.
               </div>`;

}


// =========================================
// TOP PERFORMERS
// =========================================

function renderTopPerformers() {

    const tbody =
        document.querySelector(
            "#topPerformersTable tbody"
        );


    if (!tbody) {
        return;
    }


    const metric =
        getInputValue(
            "topPerformerMetric"
        ) ||
        "bookings";


    const sorted =
        [...rmSummaryData]
        .sort(
            (a, b) => {

                if (
                    metric ===
                    "ape"
                ) {

                    return (
                        b.ape -
                        a.ape
                    );

                }


                if (
                    metric ===
                    "visitConversion"
                ) {

                    return (
                        b.visitConversion -
                        a.visitConversion
                    );

                }


                if (
                    metric ===
                    "my"
                ) {

                    return (
                        b.my -
                        a.my
                    );

                }


                return (
                    b.bookings -
                    a.bookings
                );

            }
        )
        .slice(0, 10);


    tbody.innerHTML =
        sorted.length
            ? sorted.map(
                (rm, index) => `

                <tr>

                    <td>
                        #${index + 1}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                rm.name ||
                                "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.ecode ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.zone ||
                            "-"
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            rm.visits
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            rm.bookings
                        )}
                    </td>

                    <td>
                        ${rm.visitConversion.toFixed(1)}%
                    </td>

                    <td>
                        ${formatCurrency(
                            rm.ape
                        )}
                    </td>

                </tr>

            `
            )
            .join("")
            : emptyTableRow(
                8
            );

}


// =========================================
// RM TABLE
// =========================================

function renderRMTable() {

    const tbody =
        document.querySelector(
            "#rmTable tbody"
        );


    if (!tbody) {
        return;
    }


    const sorted =
        [...rmSummaryData]
        .sort(
            (a, b) =>
                b.ape -
                a.ape
        );


    tbody.innerHTML =
        sorted.length
            ? sorted.map(rm => `

                <tr
                    data-rm-key="${escapeAttribute(
                        rm.ecode ||
                        rm.username ||
                        rm.name
                    )}"
                >

                    <td>
                        ${escapeHTML(
                            rm.ecode || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.username || "-"
                        )}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(
                                rm.name || "-"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatDate(
                            rm.doj
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.tenure
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.tl || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.zm || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.city || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.zone || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            rm.trainer || "-"
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            rm.appointments
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            rm.visits
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            rm.bookings
                        )}
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
                        ${formatCurrency(
                            rm.ape
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            rm.my
                        )}
                    </td>

                    <td>
                        ${rm.myShare.toFixed(1)}%
                    </td>

                </tr>

            `)
            .join("")
            : emptyTableRow(
                19
            );


    setText(
        "rmTableCount",
        `${sorted.length} RM(s) found`
    );


    document
        .querySelectorAll(
            "#rmTable tbody tr[data-rm-key]"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                function () {

                    const key =
                        this.dataset.rmKey;


                    const rm =
                        rmSummaryData.find(
                            item =>
                                (
                                    item.ecode ||
                                    item.username ||
                                    item.name
                                ) === key
                        );


                    if (rm) {

                        showRMModal(
                            rm
                        );

                    }

                }
            );

        });

}


// =========================================
// ZONE COMPARISON
// =========================================

function renderZoneComparison() {

    const zoneGroups =
        groupPerformance(
            rmSummaryData,
            "zone"
        );


    const tbody =
        document.querySelector(
            "#zoneTable tbody"
        );


    if (tbody) {

        tbody.innerHTML =
            renderGroupRows(
                zoneGroups,
                "zone",
                true
            );

    }


    const cityGroups =
        groupPerformance(
            rmSummaryData,
            "city"
        );


    const cityBody =
        document.querySelector(
            "#cityTable tbody"
        );


    if (cityBody) {

        cityBody.innerHTML =
            cityGroups.length
                ? cityGroups
                    .sort(
                        (a, b) =>
                            b.ape -
                            a.ape
                    )
                    .map(group => `

                        <tr>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        group.name
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${group.rms}
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
                                ${group.visitConversion.toFixed(1)}%
                            </td>

                            <td>
                                ${formatCurrency(
                                    group.ape
                                )}
                            </td>

                            <td>
                                ${formatCurrency(
                                    group.my
                                )}
                            </td>

                            <td>
                                ${group.myShare.toFixed(1)}%
                            </td>

                        </tr>

                    `)
                    .join("")
                : emptyTableRow(8);

    }


    renderZoneRanking(
        zoneGroups
    );


    renderZoneInsights(
        zoneGroups
    );

}


// =========================================
// ZONE SNAPSHOT
// =========================================

function renderZoneSnapshot() {

    const container =
        document.getElementById(
            "zoneSnapshot"
        );


    if (!container) {
        return;
    }


    const zones =
        groupPerformance(
            rmSummaryData,
            "zone"
        )
        .sort(
            (a, b) =>
                b.ape -
                a.ape
        );


    container.innerHTML =
        zones.length
            ? zones.map(zone => `

                <div class="zone-card">

                    <div class="zone-card-top">

                        <div>

                            <h4>
                                ${escapeHTML(
                                    zone.name
                                )}
                            </h4>

                            <span>
                                ${zone.rms} Active RMs
                            </span>

                        </div>

                    </div>


                    <div class="zone-metrics">

                        <div>

                            <small>
                                Bookings
                            </small>

                            <strong>
                                ${formatNumber(
                                    zone.bookings
                                )}
                            </strong>

                        </div>


                        <div>

                            <small>
                                Visit Conv.
                            </small>

                            <strong>
                                ${zone.visitConversion.toFixed(1)}%
                            </strong>

                        </div>


                        <div>

                            <small>
                                APE
                            </small>

                            <strong>
                                ${formatCurrency(
                                    zone.ape
                                )}
                            </strong>

                        </div>


                        <div>

                            <small>
                                MY Share
                            </small>

                            <strong>
                                ${zone.myShare.toFixed(1)}%
                            </strong>

                        </div>

                    </div>

                </div>

            `)
            .join("")
            : `<div class="empty-state">
                    No zone data available.
               </div>`;

}


// =========================================
// GROUP PERFORMANCE
// =========================================

function groupPerformance(
    data,
    field
) {

    const groups =
        {};


    data.forEach(rm => {


        const name =
            rm[field] ||
            "Not Available";


        if (!groups[name]) {

            groups[name] = {

                name,

                rms: 0,

                appointments: 0,

                visits: 0,

                bookings: 0,

                ape: 0,

                my: 0

            };

        }


        const group =
            groups[name];


        group.rms += 1;

        group.appointments +=
            rm.appointments;

        group.visits +=
            rm.visits;

        group.bookings +=
            rm.bookings;

        group.ape +=
            rm.ape;

        group.my +=
            rm.my;

    });


    return Object.values(
        groups
    )
    .map(group => {

        group.visitPercent =
            percentage(
                group.visits,
                group.appointments
            );


        group.appointmentConversion =
            percentage(
                group.bookings,
                group.appointments
            );


        group.visitConversion =
            percentage(
                group.bookings,
                group.visits
            );


        group.myShare =
            percentage(
                group.my,
                group.ape
            );


        return group;

    })
    .sort(
        (a, b) =>
            b.ape -
            a.ape
    );

}


// =========================================
// ZONE TABLE ROWS
// =========================================

function renderGroupRows(
    groups
) {

    return groups.length
        ? groups.map(group => `

            <tr>

                <td>
                    <strong>
                        ${escapeHTML(
                            group.name
                        )}
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
                    ${formatCurrency(
                        group.ape
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        group.my
                    )}
                </td>

                <td>
                    ${group.myShare.toFixed(1)}%
                </td>

            </tr>

        `)
        .join("")
        : emptyTableRow(
            11
        );

}


// =========================================
// ZONE RANKING
// =========================================

function renderZoneRanking(
    zones
) {

    const container =
        document.getElementById(
            "zoneRanking"
        );


    if (!container) {
        return;
    }


    const sorted =
        [...zones]
        .sort(
            (a, b) =>
                b.ape -
                a.ape
        );


    container.innerHTML =
        sorted.length
            ? sorted.map(
                (zone, index) => `

                <div class="ranking-item">

                    <div class="ranking-number">

                        ${index + 1}

                    </div>


                    <div class="ranking-info">

                        <strong>
                            ${escapeHTML(
                                zone.name
                            )}
                        </strong>

                        <span>
                            ${zone.rms} RMs
                        </span>

                    </div>


                    <div class="ranking-value">

                        <strong>
                            ${formatCurrency(
                                zone.ape
                            )}
                        </strong>

                        <small>
                            APE
                        </small>

                    </div>

                </div>

            `)
            .join("")
            : `<div class="empty-state">
                    No zone data available.
               </div>`;

}


// =========================================
// ZONE INSIGHTS
// =========================================

function renderZoneInsights(
    zones
) {

    const container =
        document.getElementById(
            "zoneInsights"
        );


    if (!container) {
        return;
    }


    if (!zones.length) {

        container.innerHTML =
            `<div class="empty-state">
                No zone data available.
            </div>`;

        return;

    }


    const bestAPE =
        [...zones]
        .sort(
            (a, b) =>
                b.ape -
                a.ape
        )[0];


    const bestConversion =
        [...zones]
        .sort(
            (a, b) =>
                b.visitConversion -
                a.visitConversion
        )[0];


    const bestMY =
        [...zones]
        .sort(
            (a, b) =>
                b.myShare -
                a.myShare
        )[0];


    container.innerHTML = `

        <div class="insight-item success">

            <strong>
                Highest APE
            </strong>

            <p>
                ${escapeHTML(bestAPE.name)}
                leads with
                ${formatCurrency(bestAPE.ape)}.
            </p>

        </div>


        <div class="insight-item">

            <strong>
                Best Visit Conversion
            </strong>

            <p>
                ${escapeHTML(bestConversion.name)}
                has
                ${bestConversion.visitConversion.toFixed(1)}%
                visit conversion.
            </p>

        </div>


        <div class="insight-item warning">

            <strong>
                Highest MY Share
            </strong>

            <p>
                ${escapeHTML(bestMY.name)}
                has
                ${bestMY.myShare.toFixed(1)}%
                MY contribution.
            </p>

        </div>

    `;

}


// =========================================
// TRAINER / TL / ZM ANALYSIS
// =========================================

function renderTrainerAnalysis() {

    renderSimpleGroupTable(
        "trainerTable",
        groupPerformance(
            rmSummaryData,
            "trainer"
        ),
        "Trainer"
    );


    renderSimpleGroupTable(
        "tlTable",
        groupPerformance(
            rmSummaryData,
            "tl"
        ),
        "TL"
    );


    const zmGroups =
        groupPerformance(
            rmSummaryData,
            "zm"
        );


    const tbody =
        document.querySelector(
            "#zmTable tbody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        zmGroups.length
            ? zmGroups.map(group => `

                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                group.name
                            )}
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
                        ${group.visitConversion.toFixed(1)}%
                    </td>

                    <td>
                        ${formatCurrency(
                            group.ape
                        )}
                    </td>

                    <td>
                        ${group.myShare.toFixed(1)}%
                    </td>

                </tr>

            `)
            .join("")
            : emptyTableRow(8);

}


function renderSimpleGroupTable(
    tableId,
    groups
) {

    const tbody =
        document.querySelector(
            `#${tableId} tbody`
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        groups.length
            ? groups.map(group => `

                <tr>

                    <td>
                        <strong>
                            ${escapeHTML(
                                group.name
                            )}
                        </strong>
                    </td>

                    <td>
                        ${group.rms}
                    </td>

                    <td>
                        ${formatNumber(
                            group.bookings
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            group.ape
                        )}
                    </td>

                    <td>
                        ${group.visitConversion.toFixed(1)}%
                    </td>

                </tr>

            `)
            .join("")
            : emptyTableRow(5);

}


// =========================================
// ROOT CAUSE INSIGHTS
// =========================================

function renderInsights() {

    const lowVisits =
        rmSummaryData.filter(
            rm =>
                rm.appointments > 0 &&
                rm.visitPercent < 50
        );


    const lowBookings =
        rmSummaryData.filter(
            rm =>
                rm.visits >= 3 &&
                rm.visitConversion < 20
        );


    const lowMY =
        rmSummaryData.filter(
            rm =>
                rm.bookings > 0 &&
                rm.myShare < 30
        );


    const strongPerformers =
        rmSummaryData.filter(
            rm =>
                rm.bookings > 0 &&
                rm.visitConversion >= 30 &&
                rm.ape > 0
        );


    renderInsightRMList(
        "lowVisitInsights",
        lowVisits,
        rm =>
            `Visit %: ${rm.visitPercent.toFixed(1)}%`
    );


    renderInsightRMList(
        "lowBookingInsights",
        lowBookings,
        rm =>
            `Visit Conversion: ${rm.visitConversion.toFixed(1)}%`
    );


    renderInsightRMList(
        "lowMYInsights",
        lowMY,
        rm =>
            `MY Share: ${rm.myShare.toFixed(1)}%`
    );


    renderInsightRMList(
        "strongPerformerInsights",
        strongPerformers
            .sort(
                (a, b) =>
                    b.ape -
                    a.ape
            )
            .slice(0, 10),
        rm =>
            `APE: ${formatCurrency(rm.ape)} | Conv: ${rm.visitConversion.toFixed(1)}%`
    );


    renderVintageTable();

    renderMYAnalysis();

}


function renderInsightRMList(
    containerId,
    data,
    metricFunction
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) {
        return;
    }


    const list =
        data
        .sort(
            (a, b) =>
                b.ape -
                a.ape
        )
        .slice(0, 10);


    container.innerHTML =
        list.length
            ? list.map(rm => `

                <div class="insight-rm-card">

                    <strong>
                        ${escapeHTML(
                            rm.name ||
                            rm.username ||
                            rm.ecode
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            rm.ecode || "-"
                        )}
                        ·
                        ${metricFunction(rm)}
                    </span>

                </div>

            `)
            .join("")
            : `<div class="empty-state">
                    No RMs currently match this condition.
               </div>`;

}


// =========================================
// VINTAGE ANALYSIS
// =========================================

function renderVintageTable() {

    const groups = {

        "0-30 Days": [],

        "31-60 Days": [],

        "61-90 Days": [],

        "91-180 Days": [],

        "180+ Days": []

    };


    rmSummaryData.forEach(rm => {

        const days =
            rm.tenureDays;


        let group =
            "180+ Days";


        if (
            days <= 30
        ) {

            group =
                "0-30 Days";

        } else if (
            days <= 60
        ) {

            group =
                "31-60 Days";

        } else if (
            days <= 90
        ) {

            group =
                "61-90 Days";

        } else if (
            days <= 180
        ) {

            group =
                "91-180 Days";

        }


        groups[group].push(
            rm
        );

    });


    const tbody =
        document.querySelector(
            "#vintageTable tbody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        Object.entries(groups)
        .map(
            ([name, rms]) => {


                const totals =
                    calculateTotals(
                        rms
                    );


                return `

                    <tr>

                        <td>
                            <strong>
                                ${name}
                            </strong>
                        </td>

                        <td>
                            ${rms.length}
                        </td>

                        <td>
                            ${formatNumber(
                                totals.appointments
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                totals.visits
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                totals.bookings
                            )}
                        </td>

                        <td>
                            ${totals.visitConversion.toFixed(1)}%
                        </td>

                        <td>
                            ${formatCurrency(
                                totals.ape
                            )}
                        </td>

                        <td>
                            ${totals.myShare.toFixed(1)}%
                        </td>

                    </tr>

                `;

            }
        )
        .join("");

}


// =========================================
// MY ANALYSIS
// =========================================

function renderMYAnalysis() {

    const container =
        document.getElementById(
            "myAnalysis"
        );


    if (!container) {
        return;
    }


    const totals =
        calculateTotals(
            rmSummaryData
        );


    const highMY =
        rmSummaryData.filter(
            rm =>
                rm.myShare >= 50
        ).length;


    const lowMY =
        rmSummaryData.filter(
            rm =>
                rm.bookings > 0 &&
                rm.myShare < 30
        ).length;


    container.innerHTML = `

        <div class="my-card">

            <span>
                Total MY
            </span>

            <strong>
                ${formatCurrency(
                    totals.my
                )}
            </strong>

        </div>


        <div class="my-card">

            <span>
                Overall MY Share
            </span>

            <strong>
                ${totals.myShare.toFixed(1)}%
            </strong>

        </div>


        <div class="my-card">

            <span>
                RMs with 50%+ MY
            </span>

            <strong>
                ${highMY}
            </strong>

        </div>


        <div class="my-card">

            <span>
                Low MY Attention
            </span>

            <strong>
                ${lowMY}
            </strong>

        </div>

    `;

}


// =========================================
// RAW DATA EXPLORER
// =========================================

function renderRawData() {

    const table =
        document.getElementById(
            "rawDataTable"
        );


    if (
        !table ||
        !allData.length
    ) {

        return;

    }


    const rawRows =
        filteredData.length
            ? filteredData
            : [];


    if (!rawRows.length) {

        table.innerHTML =
            `<tbody>
                <tr>
                    <td>No data found.</td>
                </tr>
             </tbody>`;

        return;

    }


    const columns =
        Object.keys(
            rawRows[0].raw
        );


    const thead =
        table.querySelector(
            "thead"
        );


    const tbody =
        table.querySelector(
            "tbody"
        );


    thead.innerHTML = `

        <tr>

            ${columns.map(
                column =>
                    `<th>
                        ${escapeHTML(
                            column
                        )}
                    </th>`
            )
            .join("")}

        </tr>

    `;


    tbody.innerHTML =
        rawRows
        .slice(0, 500)
        .map(row => `

            <tr>

                ${columns.map(
                    column =>
                        `<td>
                            ${escapeHTML(
                                row.raw[column]
                            )}
                        </td>`
                )
                .join("")}

            </tr>

        `)
        .join("");

}


// =========================================
// RM MODAL
// =========================================

function showRMModal(rm) {

    const modal =
        document.getElementById(
            "rmModal"
        );


    if (!modal) {
        return;
    }


    setText(
        "modalRMName",
        rm.name ||
        rm.username ||
        rm.ecode ||
        "RM Profile"
    );


    setText(
        "modalRMIdentity",
        `E-code: ${rm.ecode || "-"} | Username: ${rm.username || "-"}`
    );


    const details =
        [

            ["DOJ", formatDate(rm.doj)],

            ["Tenure", rm.tenure],

            ["TL", rm.tl || "-"],

            ["ZM", rm.zm || "-"],

            ["City", rm.city || "-"],

            ["Zone", rm.zone || "-"],

            ["Trainer", rm.trainer || "-"]

        ];


    document.getElementById(
        "modalRMDetails"
    ).innerHTML =
        details.map(
            ([label, value]) => `

            <div class="detail-box">

                <span>
                    ${escapeHTML(label)}
                </span>

                <strong>
                    ${escapeHTML(value)}
                </strong>

            </div>

        `)
        .join("");


    const performance =
        [

            ["Appointments", formatNumber(rm.appointments)],

            ["Visits", formatNumber(rm.visits)],

            ["Bookings", formatNumber(rm.bookings)],

            ["Visit %", rm.visitPercent.toFixed(1) + "%"],

            ["Appt Conversion", rm.appointmentConversion.toFixed(1) + "%"],

            ["Visit Conversion", rm.visitConversion.toFixed(1) + "%"],

            ["APE", formatCurrency(rm.ape)],

            ["MY", formatCurrency(rm.my)],

            ["MY Share", rm.myShare.toFixed(1) + "%"]

        ];


    document.getElementById(
        "modalPerformance"
    ).innerHTML =
        performance.map(
            ([label, value]) => `

            <div class="performance-box">

                <span>
                    ${escapeHTML(label)}
                </span>

                <strong>
                    ${escapeHTML(value)}
                </strong>

            </div>

        `)
        .join("");


    modal.classList.remove(
        "hidden"
    );

}


// =========================================
// CLOSE MODAL
// =========================================

function closeRMModal() {

    document
        .getElementById(
            "rmModal"
        )
        ?.classList.add(
            "hidden"
        );

}


// =========================================
// TENURE
// =========================================

function calculateTenureDays(doj) {

    const joiningDate =
        parseDate(doj);


    if (!joiningDate) {
        return 0;
    }


    const today =
        new Date();


    const difference =
        today -
        joiningDate;


    const days =
        Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
        );


    return Math.max(
        0,
        days
    );

}


function formatTenure(days) {

    if (
        !days &&
        days !== 0
    ) {

        return "-";

    }


    const months =
        Math.floor(
            days / 30
        );


    if (
        months < 1
    ) {

        return `${days} Days`;

    }


    const years =
        Math.floor(
            months / 12
        );


    const remainingMonths =
        months % 12;


    if (
        years > 0
    ) {

        return remainingMonths
            ? `${years}Y ${remainingMonths}M`
            : `${years} Year`;

    }


    return `${months} Months`;

}


function matchesTenure(
    days,
    range
) {

    if (
        range === "0-30"
    ) {

        return (
            days >= 0 &&
            days <= 30
        );

    }


    if (
        range === "31-60"
    ) {

        return (
            days >= 31 &&
            days <= 60
        );

    }


    if (
        range === "61-90"
    ) {

        return (
            days >= 61 &&
            days <= 90
        );

    }


    if (
        range === "91-180"
    ) {

        return (
            days >= 91 &&
            days <= 180
        );

    }


    if (
        range === "181+"
    ) {

        return (
            days >= 181
        );

    }


    return true;

}


// =========================================
// HELPERS
// =========================================

function percentage(
    numerator,
    denominator
) {

    if (
        !denominator ||
        denominator <= 0
    ) {

        return 0;

    }


    return (
        numerator /
        denominator
    ) * 100;

}


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 0
        }
    );

}


function formatCurrency(value) {

    const number =
        Number(value || 0);


    if (
        Math.abs(number) >=
        10000000
    ) {

        return (
            "₹" +
            (number / 10000000)
                .toFixed(2) +
            " Cr"
        );

    }


    if (
        Math.abs(number) >=
        100000
    ) {

        return (
            "₹" +
            (number / 100000)
                .toFixed(2) +
            " L"
        );

    }


    return (
        "₹" +
        number.toLocaleString(
            "en-IN",
            {
                maximumFractionDigits: 0
            }
        )
    );

}


function formatDate(value) {

    const date =
        parseDate(value);


    if (!date) {
        return value || "-";
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


function setWidth(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.style.width =
            Math.max(
                0,
                Math.min(
                    100,
                    value
                )
            ) + "%";

    }

}


function emptyTableRow(
    colspan
) {

    return `

        <tr>

            <td
                colspan="${colspan}"
                class="empty-state"
            >

                No data available.

            </td>

        </tr>

    `;

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(
        value
    );

}


// =========================================
// LOADING
// =========================================

function showLoading(show) {

    const overlay =
        document.getElementById(
            "loadingOverlay"
        );


    if (!overlay) {
        return;
    }


    if (show) {

        overlay.classList.remove(
            "hidden"
        );

    } else {

        overlay.classList.add(
            "hidden"
        );

    }

}


// =========================================
// CONNECTION STATUS
// =========================================

function setConnectionStatus(
    text,
    status
) {

    const statusText =
        document.getElementById(
            "dataStatus"
        );


    const dot =
        document.getElementById(
            "dataStatusDot"
        );


    if (statusText) {

        statusText.textContent =
            text;

    }


    if (dot) {

        dot.className =
            "status-dot";


        if (
            status === "connected"
        ) {

            dot.classList.add(
                "connected"
            );

        }


        if (
            status === "error"
        ) {

            dot.classList.add(
                "error"
            );

        }

    }

}


// =========================================
// LAST UPDATED
// =========================================

function updateLastUpdated() {

    const now =
        new Date();


    setText(
        "lastUpdated",
        now.toLocaleString(
            "en-IN",
            {

                day: "2-digit",

                month: "short",

                hour: "2-digit",

                minute: "2-digit"

            }
        )
    );

}


// =========================================
// CONNECTION ERROR
// =========================================

function showConnectionError(
    message
) {

    console.warn(
        "Dashboard could not load Google Sheet:",
        message
    );


    // Keep the website usable.
    // The Data Status indicator will show
    // Connection Failed.

}
