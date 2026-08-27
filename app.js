// ==========================================
// FOS PERFORMANCE PORTAL
// GOOGLE SHEETS CONNECTION
// ==========================================


// YOUR GOOGLE APPS SCRIPT WEB APP URL

const GOOGLE_SHEET_API =
"https://script.google.com/a/macros/iimtrichy.ac.in/s/AKfycbzDBzHt8Pt5BEy1Z3Y-zDZ5S6qchbkaNSU06777Yv2T7OHluGtgsP9zoTH04onwer4/exec";


// ==========================================
// LOAD DATA WHEN WEBSITE OPENS
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    setTodayDate();

    loadGoogleSheetData();

});


// ==========================================
// GET DATA FROM GOOGLE SHEET
// ==========================================

async function loadGoogleSheetData() {

    try {

        console.log("Loading Google Sheet data...");

        const response = await fetch(GOOGLE_SHEET_API);

        if (!response.ok) {
            throw new Error("Unable to load Google Sheet");
        }

        const data = await response.json();

        console.log("Google Sheet Data:", data);


        // Update the website

        updateDashboard(data);

        updateRMTable(data);

        updateTopPerformers(data);

        updateZonePerformance(data);


    } catch (error) {

        console.error("Error loading data:", error);

        alert(
            "Unable to load the Google Sheet data. Please check the Apps Script deployment settings."
        );

    }

}


// ==========================================
// HELPER FUNCTION
// CONVERT VALUES INTO NUMBERS
// ==========================================

function getNumber(value) {

    if (value === undefined || value === null || value === "") {
        return 0;
    }

    return Number(
        String(value)
            .replace(/₹/g, "")
            .replace(/,/g, "")
            .replace(/L/g, "")
            .trim()
    ) || 0;

}


// ==========================================
// FIND COLUMN VALUE
// Supports slightly different column names
// ==========================================

function getValue(row, possibleNames) {

    for (let name of possibleNames) {

        if (row[name] !== undefined) {
            return row[name];
        }

    }

    return "";

}


// ==========================================
// UPDATE DASHBOARD CARDS
// ==========================================

function updateDashboard(data) {

    if (!data || data.length === 0) {
        return;
    }


    // TOTAL RMS

    const totalRMs = data.length;


    // TOTAL VISITS

    const totalVisits = data.reduce((total, row) => {

        return total + getNumber(
            getValue(row, ["Visits", "Visit"])
        );

    }, 0);


    // TOTAL BOOKINGS

    const totalBookings = data.reduce((total, row) => {

        return total + getNumber(
            getValue(row, ["Bookings", "Booking"])
        );

    }, 0);


    // CONVERSION RATE

    const conversionRate =
        totalVisits > 0
            ? ((totalBookings / totalVisits) * 100).toFixed(1)
            : 0;


    // FIND STAT CARDS

    const statCards =
        document.querySelectorAll(".stat-card");


    if (statCards.length >= 4) {

        // Total RMs

        statCards[0]
            .querySelector("h2")
            .textContent = totalRMs;


        // Total Bookings

        statCards[1]
            .querySelector("h2")
            .textContent = totalBookings;


        // Total Visits

        statCards[2]
            .querySelector("h2")
            .textContent = totalVisits;


        // Conversion Rate

        statCards[3]
            .querySelector("h2")
            .textContent =
            conversionRate + "%";

    }

}


// ==========================================
// UPDATE RM TRACKER TABLE
// ==========================================

function updateRMTable(data) {

    const table =
        document.getElementById("rmTable");


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector("tbody");


    tbody.innerHTML = "";


    data.forEach(row => {


        const rmName = getValue(
            row,
            ["RM Name", "RM", "Name"]
        );


        const zone = getValue(
            row,
            ["Zone"]
        );


        const visits =
            getNumber(
                getValue(row, ["Visits", "Visit"])
            );


        const appointments =
            getNumber(
                getValue(
                    row,
                    ["Appointments", "Appointment"]
                )
            );


        const bookings =
            getNumber(
                getValue(
                    row,
                    ["Bookings", "Booking"]
                )
            );


        const ape =
            getValue(row, ["APE"]);


        const ats =
            getValue(row, ["ATS"]);


        const conversion =
            visits > 0
                ? ((bookings / visits) * 100)
                    .toFixed(1)
                : 0;


        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>${rmName}</td>

            <td>${zone}</td>

            <td>${visits}</td>

            <td>${appointments}</td>

            <td>${bookings}</td>

            <td>${formatCurrency(ape)}</td>

            <td>${formatCurrency(ats)}</td>

            <td>
                <span class="success">
                    ${conversion}%
                </span>
            </td>

        `;


        tbody.appendChild(tr);


    });

}


// ==========================================
// UPDATE TOP PERFORMERS TABLE
// ==========================================

function updateTopPerformers(data) {


    // Create a copy and calculate conversion

    const performers =
        data.map(row => {


            const visits =
                getNumber(
                    getValue(
                        row,
                        ["Visits", "Visit"]
                    )
                );


            const bookings =
                getNumber(
                    getValue(
                        row,
                        ["Bookings", "Booking"]
                    )
                );


            const conversion =
                visits > 0
                    ? (bookings / visits) * 100
                    : 0;


            return {

                ...row,

                visits,

                bookings,

                conversion

            };

        });


    // Sort by bookings first

    performers.sort((a, b) => {

        return b.bookings - a.bookings;

    });


    // Get top 5

    const topFive =
        performers.slice(0, 5);


    // The first table on dashboard

    const tables =
        document.querySelectorAll("table");


    if (tables.length === 0) {
        return;
    }


    const topTable =
        tables[0];


    const tbody =
        topTable.querySelector("tbody");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    topFive.forEach((row, index) => {


        const rank = index + 1;


        const rankClass =
            rank === 1
                ? "gold"
                : rank === 2
                ? "silver"
                : rank === 3
                ? "bronze"
                : "";


        const rmName =
            getValue(
                row,
                ["RM Name", "RM", "Name"]
            );


        const zone =
            getValue(
                row,
                ["Zone"]
            );


        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>
                <span class="rank ${rankClass}">
                    ${rank}
                </span>
            </td>

            <td>
                <strong>${rmName}</strong>
            </td>

            <td>${zone}</td>

            <td>${row.visits}</td>

            <td>${row.bookings}</td>

            <td>
                <span class="success">
                    ${row.conversion.toFixed(1)}%
                </span>
            </td>

        `;


        tbody.appendChild(tr);


    });

}


// ==========================================
// UPDATE ZONE PERFORMANCE
// ==========================================

function updateZonePerformance(data) {


    const zoneData = {};


    data.forEach(row => {


        const zone =
            getValue(row, ["Zone"]);


        if (!zone) {
            return;
        }


        const visits =
            getNumber(
                getValue(
                    row,
                    ["Visits", "Visit"]
                )
            );


        const bookings =
            getNumber(
                getValue(
                    row,
                    ["Bookings", "Booking"]
                )
            );


        if (!zoneData[zone]) {

            zoneData[zone] = {

                visits: 0,

                bookings: 0

            };

        }


        zoneData[zone].visits += visits;

        zoneData[zone].bookings += bookings;


    });


    const zoneCards =
        document.querySelectorAll(".zone-card");


    zoneCards.forEach(card => {


        const zoneName =
            card.querySelector("h4")
                .textContent
                .trim();


        const zone =
            zoneData[zoneName];


        if (!zone) {
            return;
        }


        const percentage =
            zone.visits > 0
                ? Math.round(
                    (zone.bookings / zone.visits) * 100
                )
                : 0;


        const progressBar =
            card.querySelector(".progress-bar");


        const percentageText =
            card.querySelector("strong");


        if (progressBar) {

            progressBar.style.width =
                percentage + "%";

        }


        if (percentageText) {

            percentageText.textContent =
                percentage + "%";

        }


    });


}


// ==========================================
// SEARCH RM
// ==========================================

function searchRM() {

    const input =
        document.getElementById("rmSearch");


    if (!input) {
        return;
    }


    const filter =
        input.value.toLowerCase();


    const table =
        document.getElementById("rmTable");


    const rows =
        table
            .querySelector("tbody")
            .querySelectorAll("tr");


    rows.forEach(row => {


        const text =
            row.textContent.toLowerCase();


        row.style.display =
            text.includes(filter)
                ? ""
                : "none";


    });

}


// ==========================================
// PAGE NAVIGATION
// ==========================================

function showPage(pageName) {


    // Hide all pages

    const pages =
        document.querySelectorAll(".page");


    pages.forEach(page => {

        page.classList.remove(
            "active-page"
        );

    });


    // Show selected page

    const selectedPage =
        document.getElementById(pageName);


    if (selectedPage) {

        selectedPage.classList.add(
            "active-page"
        );

    }


    // Update navigation

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(item => {

        item.classList.remove(
            "active"
        );

    });


    // Update title

    const titles = {

        dashboard:
            "Performance Dashboard",

        rm:
            "RM Performance Tracker",

        master:
            "Master Sheet",

        contest:
            "Star Contest",

        zone:
            "Zone-wise Performance",

        visit:
            "Visit Tracker",

        appointment:
            "Appointment Tracker",

        booking:
            "Booking Tracker"

    };


    const pageTitle =
        document.getElementById(
            "pageTitle"
        );


    if (
        pageTitle &&
        titles[pageName]
    ) {

        pageTitle.textContent =
            titles[pageName];

    }


}


// ==========================================
// FORMAT CURRENCY
// ==========================================

function formatCurrency(value) {


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return "-";

    }


    const number =
        getNumber(value);


    if (number >= 100000) {

        return "₹" +
            (number / 100000)
                .toFixed(2) +
            "L";

    }


    return "₹" +
        number.toLocaleString(
            "en-IN"
        );


}


// ==========================================
// TODAY'S DATE
// ==========================================

function setTodayDate() {


    const todayDate =
        document.getElementById(
            "todayDate"
        );


    if (!todayDate) {
        return;
    }


    const today =
        new Date();


    todayDate.textContent =
        today.toLocaleDateString(
            "en-IN",
            {

                day: "numeric",

                month: "short",

                year: "numeric"

            }
        );


}
