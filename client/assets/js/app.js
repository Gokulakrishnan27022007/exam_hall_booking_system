let token = "";

const portalGrid = document.getElementById("portalGrid");
const authCard = document.getElementById("authCard");
const dashboardCard = document.getElementById("dashboardCard");
const dashboardTitle = document.getElementById("dashboardTitle");
const dashboardContent = document.getElementById("dashboardContent");
const authTitle = document.getElementById("authTitle");
const profileMenu = document.getElementById("profileMenu");

const DEPARTMENTS = [
  "CSE",
  "IT",
  "ECE",
  "EEE",
  "MECH",
  "CIVIL",
  "AIDS",
  "CSBS",
  "M.Sc Computer Science (Integrated)",
  "M.Sc Information Technology (Integrated)",
  "MCA",
  "M.E CSE",
  "M.Tech Information Technology",
  "MBA"
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SLOT_OPTIONS = [
  "08:30-10:00",
  "10:30-12:00",
  "13:30-15:00",
  "15:30-17:00"
];
const calendarState = {};
const calendarCache = {};

function deptOptions(selected = "") {
  return DEPARTMENTS.map((department) => `<option value="${department}" ${selected === department ? "selected" : ""}>${department}</option>`).join("");
}

function semOptions(selected = "") {
  return SEMESTERS.map((semester) => `<option value="${semester}" ${Number(selected) === semester ? "selected" : ""}>Semester ${semester}</option>`).join("");
}

function slotOptions(selected = "") {
  return SLOT_OPTIONS.map((slot) => `<option value="${slot}" ${selected === slot ? "selected" : ""}>${slot}</option>`).join("");
}

function formatTime12Hour(value) {
  if (!value || !value.includes(":")) return value || "-";
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatSlotLabel(slot) {
  if (!slot || !String(slot).includes("-")) return slot || "-";
  const [start, end] = String(slot).split("-");
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
}

function formatDateLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTimeLabel(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function setTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("ehms_theme", theme);
}

setTheme(localStorage.getItem("ehms_theme") || "light");

async function request(url, method = "GET", data) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : ""
    },
    body: data ? JSON.stringify(data) : undefined
  });

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: response.ok ? "Request completed" : "Request failed",
      raw: text
    };
  }
}

function table(headers, rows) {
  return `<table class="table"><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.join("") : `<tr><td colspan="${headers.length}">No records</td></tr>`}</tbody></table>`;
}

function showPortal(portal) {
  portalGrid.classList.add("hidden");
  authCard.classList.remove("hidden");

  document.getElementById("adminLogin").classList.add("hidden");
  document.getElementById("facultyLogin").classList.add("hidden");
  document.getElementById("studentLogin").classList.add("hidden");
  document.getElementById("studentRegister").classList.add("hidden");
  document.getElementById("registerSwitch").classList.add("hidden");

  if (portal === "admin") {
    authTitle.textContent = "Admin Login";
    document.getElementById("adminLogin").classList.remove("hidden");
  }

  if (portal === "faculty") {
    authTitle.textContent = "Faculty Login";
    document.getElementById("facultyLogin").classList.remove("hidden");
  }

  if (portal === "student") {
    authTitle.textContent = "Student / Representative Login";
    document.getElementById("studentLogin").classList.remove("hidden");
    document.getElementById("registerSwitch").classList.remove("hidden");
  }
}

async function login(url, form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const result = await request(url, "POST", data);
  if (!result.token) {
    alert(result.message || "Login failed");
    return;
  }

  token = result.token;
  authCard.classList.add("hidden");
  portalGrid.classList.add("hidden");
  dashboardCard.classList.remove("hidden");
  await loadDashboard();
}

function renderMetricGrid(items) {
  return `<div class="metric-grid">${items.map((item) => `<div class="metric-card"><h3>${item.label}</h3><p>${item.value}</p></div>`).join("")}</div>`;
}

function renderProfile(dash) {
  const idLabel = dash.role === "admin" ? "Admin ID" : dash.role === "faculty" ? "Staff ID" : "Roll No";
  const idValue = dash.adminId || dash.staffId || dash.rollNo || "-";

  return `
    <div class="section profile-compact-card">
      <div class="profile-compact-main">
        <div class="profile-avatar">${escapeHtml((dash.name || "U").trim().charAt(0).toUpperCase())}</div>
        <div class="profile-compact-copy">
          <h3>${escapeHtml(dash.name || "-")}</h3>
          <p>${escapeHtml(dash.role || "-")} portal</p>
        </div>
      </div>
      <div class="profile-badges">
        <span class="profile-badge"><small>${idLabel}</small><strong>${escapeHtml(idValue)}</strong></span>
        <span class="profile-badge"><small>Department</small><strong>${escapeHtml(dash.department || "-")}</strong></span>
        <span class="profile-badge"><small>Semester</small><strong>${escapeHtml(dash.semester || "-")}</strong></span>
      </div>
      <div class="profile-actions-inline">
        <button type="button" id="toggleProfileEdit" class="secondary compact-btn">Edit Profile</button>
      </div>
      <div class="profile-edit hidden" id="profileEditPanel">
        <h3>Edit Profile</h3>
        <form id="profileForm" class="row">
          <input name="name" placeholder="Update name" value="${dash.name || ""}" required>
          <input name="password" type="password" placeholder="New password (optional)">
          <button>Save Profile</button>
        </form>
      </div>
    </div>
  `;
}

function buildSubjectOptions(subjects) {
  if (!subjects.length) {
    return `<option value="">No official Anna University subjects found for this semester</option>`;
  }

  return [
    `<option value="">Select Anna University subject (optional)</option>`,
    ...subjects.map((subject) => `<option value="${subject.courseCode}">${subject.courseCode} - ${subject.courseName}</option>`)
  ].join("");
}

function renderCatalogMeta(catalog) {
  if (!catalog || !catalog.supported) {
    return `<div class="notice">No cached Anna University syllabus catalog is available for this department yet. You can still create exams manually.</div>`;
  }

  const semesterLabel = catalog.semester ? `Semester ${catalog.semester}` : "Official syllabus";
  return `
    <div class="catalog-meta">
      <span class="pill">${catalog.department}</span>
      <span class="pill">${semesterLabel}</span>
      <span class="pill">${catalog.regulation}</span>
      <a href="${catalog.sourceUrl}" target="_blank" rel="noreferrer">Open official Anna University syllabus PDF</a>
    </div>
  `;
}

function renderHallAvailabilityTable(items) {
  return table(
    ["Hall", "Location", "Capacity", "Booked", "Available", "Status"],
    (Array.isArray(items) ? items : []).map((hall) => `
      <tr>
        <td>${hall.hallName}</td>
        <td>${hall.location}</td>
        <td>${hall.capacity}</td>
        <td>${hall.seatsUsed}</td>
        <td>${hall.seatsLeft}</td>
        <td>${hall.seatsLeft > 0 ? "Available" : "Full"}</td>
      </tr>
    `)
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toLocalDateParts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate()
  };
}

function toDateKey(value) {
  const parts = toLocalDateParts(value);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getMonthStart(date) {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatMonthLabel(date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function buildCalendarEvents(items, mapper) {
  return (Array.isArray(items) ? items : [])
    .map((item) => mapper(item))
    .filter((event) => event && event.dateKey);
}

function renderCalendarSection(title, events, key) {
  const todayKey = toDateKey(new Date());
  const baseDate = events.length ? new Date(events[0].rawDate) : new Date();
  calendarState[key] = calendarState[key] || getMonthStart(baseDate);
  calendarCache[key] = { title, events };

  const monthDate = getMonthStart(calendarState[key]);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const eventMap = events.reduce((map, event) => {
    map[event.dateKey] = map[event.dateKey] || [];
    map[event.dateKey].push(event);
    return map;
  }, {});

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(cellDate);
    const items = eventMap[dateKey] || [];
    const isOutside = cellDate.getMonth() !== month;
    const isToday = dateKey === todayKey;

    const visibleItems = items.slice(0, 2);
    const hiddenCount = items.length - visibleItems.length;

    cells.push(`
      <div class="calendar-day ${isOutside ? "outside" : ""} ${isToday ? "today" : ""}">
        <div class="calendar-day-header">
          <span>${cellDate.getDate()}</span>
          ${items.length ? `<span class="calendar-count">${items.length}</span>` : ""}
        </div>
        <div class="calendar-day-events">
          ${visibleItems.map((event) => `
            <div class="calendar-event ${event.variant || "default"}">
              <strong>${escapeHtml(event.title)}</strong>
              <small>${escapeHtml(event.meta || "")}</small>
            </div>
          `).join("")}
          ${hiddenCount > 0 ? `<div class="calendar-more">+${hiddenCount} more</div>` : ""}
        </div>
      </div>
    `);
  }

  return `
    <div class="section card calendar-card" data-calendar-root="${key}">
      <div class="calendar-header">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p class="select-note">Month view for booking dates and confirmed exam schedules.</p>
        </div>
        <div class="calendar-toolbar">
          <button type="button" class="secondary calendar-nav" onclick="changeCalendarMonth('${key}', -1)">Previous</button>
          <span class="calendar-label">${formatMonthLabel(monthDate)}</span>
          <button type="button" class="secondary calendar-nav" onclick="changeCalendarMonth('${key}', 1)">Next</button>
        </div>
      </div>
      <div class="calendar-weekdays">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>
      <div class="calendar-grid">
        ${cells.join("")}
      </div>
      <div class="calendar-legend">
        <span class="legend-item"><i class="legend-dot approved"></i>Confirmed / Active</span>
        <span class="legend-item"><i class="legend-dot pending"></i>Pending</span>
        <span class="legend-item"><i class="legend-dot rejected"></i>Rejected</span>
      </div>
    </div>
  `;
}

async function loadDashboard() {
  const dash = await request("/api/dashboard/me");
  dashboardTitle.textContent = `${String(dash.role || "").toUpperCase()} Dashboard - ${dash.name || ""}`;
  const me = await request("/api/auth/me");
  Object.assign(dash, me);

  if (dash.role === "admin") {
    const bookings = await request("/api/bookings");
    const halls = await request("/api/halls");
    const advisorData = await request("/api/auth/faculty-advisors");
    const advisors = Array.isArray(advisorData.advisors) ? advisorData.advisors : [];
    const adminDepartments = [...new Set([...(Array.isArray(advisorData.departments) ? advisorData.departments : []), ...DEPARTMENTS])].sort((a, b) => a.localeCompare(b));
    const adminCalendarEvents = buildCalendarEvents(bookings, (booking) => ({
      rawDate: booking.examDate,
      dateKey: toDateKey(booking.examDate),
      dateLabel: booking.examDate,
      title: `${booking.exam?.examCode || ""} ${booking.exam?.examName || "Booking"}`.trim(),
      meta: `${booking.hall?.hallName || "Hall"} • ${formatSlotLabel(booking.slot)} • ${booking.status || ""}`,
      variant: booking.status === "admin_confirmed" ? "approved" : booking.status?.includes("rejected") ? "rejected" : "pending"
    }));
    dashboardContent.innerHTML = `
      ${renderProfile(dash)}
      <div class="section">${renderMetricGrid([
        { label: "Total Users", value: dash.totalUsers || 0 },
        { label: "Total Halls", value: dash.totalHalls || 0 },
        { label: "Total Exams", value: dash.totalExams || 0 },
        { label: "Pending Confirmations", value: dash.pendingAdmin || 0 }
      ])}</div>

      ${renderCalendarSection("System Booking Calendar", adminCalendarEvents, "admin-calendar")}

      <div class="section card">
        <div class="topbar">
          <div>
            <h3>Export Booking Data</h3>
            <p class="select-note">Download the full booking register as a CSV file from the admin portal.</p>
          </div>
          <div class="calendar-toolbar">
            <button type="button" id="exportBookingsBtn">Export CSV</button>
            <button type="button" class="secondary" id="exportBookingsPdfBtn">Export PDF</button>
          </div>
        </div>
      </div>

      <div class="section card">
        <h3>Create Hall</h3>
        <form id="createHallForm" class="row">
          <input name="hallName" placeholder="Hall Name" required>
          <input name="capacity" type="number" placeholder="Capacity" required>
          <input name="location" placeholder="Location" required>
          <button>Create Hall</button>
        </form>
      </div>

      <div class="section card">
        <h3>Create Faculty Advisor</h3>
        <form id="createFacultyAdvisorForm" class="row">
          <input name="name" placeholder="Faculty Name" required>
          <input name="staffId" placeholder="Staff ID" required>
          <select name="department" required>
            <option value="">Select Department</option>
            ${adminDepartments.map((department) => `<option value="${department}">${department}</option>`).join("")}
          </select>
          <input name="password" type="password" placeholder="Temporary Password" required>
          <button>Create Faculty Advisor</button>
        </form>
      </div>

      <div class="section card">
        <h3>Assign Faculty Advisor To Department</h3>
        <p class="select-note">This links all students and representatives in the selected department to the chosen faculty advisor.</p>
        <form id="assignFacultyAdvisorForm" class="row">
          <select name="department" id="advisorDepartmentSelect" required>
            <option value="">Select Department</option>
            ${adminDepartments.map((department) => `<option value="${department}">${department}</option>`).join("")}
          </select>
          <select name="facultyId" id="advisorSelect" required>
            <option value="">Select Department First</option>
          </select>
          <button>Assign Faculty Advisor</button>
        </form>
      </div>

      <div class="section card">
        <h3>Faculty Advisors</h3>
        ${table(
          ["Name", "Staff ID", "Department", "Mapped Students"],
          advisors.map((advisor) => `<tr><td>${advisor.name}</td><td>${advisor.staffId || "-"}</td><td>${advisor.department || "-"}</td><td>${advisor.assignedStudents || 0}</td></tr>`)
        )}
      </div>

      <div class="section card">
        <h3>Edit Exam Hall</h3>
        <p class="select-note">Select a hall from the table below to update its name, capacity, or location.</p>
        <form id="editHallForm" class="row hidden">
          <input type="hidden" name="id">
          <input name="hallName" placeholder="Hall Name" required>
          <input name="capacity" type="number" placeholder="Capacity" required>
          <input name="location" placeholder="Location" required>
          <button>Save Hall Changes</button>
          <button type="button" class="secondary" id="cancelHallEdit">Cancel</button>
        </form>
        <p class="select-note" id="hallEditHint">No hall selected for editing yet.</p>
      </div>

      <div class="section card">
        <h3>Manage Exam Halls</h3>
        ${table(
          ["Hall", "Capacity", "Location", "Action"],
          (Array.isArray(halls) ? halls : []).map((hall) => `
            <tr>
              <td>${hall.hallName}</td>
              <td>${hall.capacity}</td>
              <td>${hall.location}</td>
              <td><button type="button" class="hall-edit-btn" data-id="${hall._id}" data-name="${escapeHtml(hall.hallName)}" data-capacity="${hall.capacity}" data-location="${escapeHtml(hall.location)}">Edit Hall</button></td>
            </tr>
          `)
        )}
      </div>

      <div class="section card">
        <h3>Faculty Approved Bookings</h3>
        ${table(
          ["Exam", "Department", "Date", "Slot", "Hall", "Seats", "Faculty Decision Time", "Status", "Action"],
          bookings.filter((booking) => booking.status === "faculty_approved").map((booking) => `
            <tr>
              <td>${booking.exam.examName}</td>
              <td>${booking.department}</td>
              <td>${formatDateLabel(booking.examDate)}</td>
              <td>${formatSlotLabel(booking.slot)}</td>
              <td>${booking.hall.hallName}</td>
              <td>${booking.seatsRequested}</td>
              <td>${formatDateTimeLabel(booking.facultyDecisionAt)}</td>
              <td>${booking.status}</td>
              <td>
                <button onclick="adminConfirm('${booking._id}', true)">Confirm</button>
                <button class="secondary" onclick="adminConfirm('${booking._id}', false)">Reject</button>
              </td>
            </tr>
          `)
        )}
      </div>

      <div class="section card">
        <h3>Recent Audit Logs</h3>
        ${table(
          ["Time", "Action", "Module"],
          (dash.recentLogs || []).map((log) => `<tr><td>${new Date(log.createdAt).toLocaleString()}</td><td>${log.action}</td><td>${log.module}</td></tr>`)
        )}
      </div>
    `;

    document.getElementById("createHallForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const result = await request("/api/halls", "POST", data);
      alert(result.message || "Hall created");
      loadDashboard();
    });

    document.getElementById("exportBookingsBtn").addEventListener("click", () => {
      downloadAdminReport("/api/bookings/export", "csv");
    });

    document.getElementById("exportBookingsPdfBtn").addEventListener("click", () => {
      downloadAdminReport("/api/bookings/export-pdf", "pdf");
    });

    const editHallForm = document.getElementById("editHallForm");
    const hallEditHint = document.getElementById("hallEditHint");

    document.querySelectorAll(".hall-edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        editHallForm.classList.remove("hidden");
        hallEditHint.textContent = `Editing ${button.dataset.name}`;
        editHallForm.elements.id.value = button.dataset.id;
        editHallForm.elements.hallName.value = button.dataset.name;
        editHallForm.elements.capacity.value = button.dataset.capacity;
        editHallForm.elements.location.value = button.dataset.location;
        editHallForm.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    editHallForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const result = await request(`/api/halls/${data.id}`, "PATCH", {
        hallName: data.hallName,
        capacity: Number(data.capacity),
        location: data.location
      });
      alert(result.message || "Hall updated");
      loadDashboard();
    });

    document.getElementById("cancelHallEdit").addEventListener("click", () => {
      editHallForm.reset();
      editHallForm.classList.add("hidden");
      hallEditHint.textContent = "No hall selected for editing yet.";
    });

    function syncAdvisorOptions() {
      const departmentSelect = document.getElementById("advisorDepartmentSelect");
      const advisorSelect = document.getElementById("advisorSelect");
      const department = departmentSelect.value;
      const filteredAdvisors = advisors.filter((advisor) => advisor.department === department);

      advisorSelect.innerHTML = filteredAdvisors.length
        ? `<option value="">Select Faculty Advisor</option>${filteredAdvisors.map((advisor) => `<option value="${advisor._id}">${advisor.name} (${advisor.staffId || "-"})</option>`).join("")}`
        : `<option value="">No Faculty Advisor For This Department</option>`;
    }

    document.getElementById("advisorDepartmentSelect").addEventListener("change", syncAdvisorOptions);

    document.getElementById("createFacultyAdvisorForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const result = await request("/api/auth/faculty-advisors", "POST", data);
      alert(result.message || "Faculty advisor created");
      loadDashboard();
    });

    document.getElementById("assignFacultyAdvisorForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const result = await request(`/api/auth/faculty-advisors/${data.facultyId}/assign-department`, "PATCH", {
        department: data.department
      });
      alert(result.message || "Faculty advisor assigned");
      loadDashboard();
    });

    bindProfileForm();
    return;
  }

  if (dash.role === "faculty") {
    const bookings = await request("/api/bookings");
    const facultyCalendarEvents = buildCalendarEvents(bookings, (booking) => ({
      rawDate: booking.examDate,
      dateKey: toDateKey(booking.examDate),
      dateLabel: booking.examDate,
      title: `${booking.exam?.examCode || ""} ${booking.exam?.examName || "Exam"}`.trim(),
      meta: `${booking.requestedBy?.name || "Representative"} • ${formatSlotLabel(booking.slot)} • ${booking.status || ""}`,
      variant: booking.status === "admin_confirmed" || booking.status === "faculty_approved" ? "approved" : booking.status?.includes("rejected") ? "rejected" : "pending"
    }));

    dashboardContent.innerHTML = `
      ${renderProfile(dash)}
      <div class="section">${renderMetricGrid([
        { label: "My Exams", value: dash.totalMyExams || 0 },
        { label: "Pending Faculty Reviews", value: dash.pendingFaculty || 0 }
      ])}</div>

      ${renderCalendarSection("Faculty Booking Calendar", facultyCalendarEvents, "faculty-calendar")}

      <div class="section card">
        <h3>Create Exam</h3>
        <p class="select-note">Department is fixed to your faculty department. Pick a semester to load the cached Anna University syllabus and create the subject as an exam.</p>
        <div id="catalogMeta"></div>
        <form id="createExamForm" class="row">
          <input value="${dash.department || ""}" disabled>
          <select name="semester" id="examSemesterSelect" required>
            <option value="">Select Semester</option>
            ${semOptions()}
          </select>
          <select id="officialSubjectSelect">
            <option value="">Select Anna University subject (optional)</option>
          </select>
          <input name="examCode" placeholder="Exam Code" required>
          <input name="examName" placeholder="Exam Name" required>
          <button>Create Exam</button>
        </form>
      </div>

      <div class="section card">
        <h3>Assign Representative</h3>
        <form id="repFilterForm" class="row">
          <input value="${dash.department || ""}" disabled>
          <select name="semester" required>
            <option value="">Select Semester</option>
            ${semOptions()}
          </select>
          <button>Load Students</button>
        </form>
        <p class="select-note">Faculty can load students from their own department semester list and select one as representative.</p>
        <div id="studentPicker" class="student-picker"></div>
      </div>

      <div class="section card">
        <h3>Current Representatives</h3>
        ${table(
          ["Name", "Roll No", "Department", "Semester"],
          (dash.representatives || []).map((rep) => `<tr><td>${rep.name}</td><td>${rep.rollNo || "-"}</td><td>${rep.department || "-"}</td><td>${rep.semester || "-"}</td></tr>`)
        )}
      </div>

      <div class="section card">
        <h3>Pending Booking Requests</h3>
        <div id="facultyBookings"></div>
      </div>

      <div class="section card">
        <h3>My Exams</h3>
        ${table(
          ["Semester", "Code", "Exam", "Source", "Created On"],
          (dash.myExams || []).map((exam) => `<tr><td>${exam.semester}</td><td>${exam.examCode}</td><td>${exam.examName}</td><td>${exam.source === "anna_university" ? "Anna University" : "Manual"}</td><td>${formatDateTimeLabel(exam.createdAt)}</td></tr>`)
        )}
      </div>
    `;

    let officialCatalog = { subjects: [], sourceUrl: "", supported: false };

    async function loadFacultyCatalog(semester) {
      if (!semester) {
        officialCatalog = { subjects: [], sourceUrl: "", supported: false };
        document.getElementById("officialSubjectSelect").innerHTML = `<option value="">Select Anna University subject (optional)</option>`;
        document.getElementById("catalogMeta").innerHTML = "";
        return;
      }

      officialCatalog = await request(`/api/exams/catalog?semester=${encodeURIComponent(semester)}`);
      const subjects = Array.isArray(officialCatalog.subjects) ? officialCatalog.subjects : [];
      document.getElementById("officialSubjectSelect").innerHTML = buildSubjectOptions(subjects);
      document.getElementById("catalogMeta").innerHTML = renderCatalogMeta(officialCatalog);
    }

    document.getElementById("examSemesterSelect").addEventListener("change", async (event) => {
      await loadFacultyCatalog(event.target.value);
    });

    document.getElementById("officialSubjectSelect").addEventListener("change", (event) => {
      const subjects = Array.isArray(officialCatalog.subjects) ? officialCatalog.subjects : [];
      const selected = subjects.find((subject) => subject.courseCode === event.target.value);
      if (!selected) return;
      document.querySelector("#createExamForm input[name='examCode']").value = selected.courseCode;
      document.querySelector("#createExamForm input[name='examName']").value = selected.courseName;
    });

    document.getElementById("createExamForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const subjects = Array.isArray(officialCatalog.subjects) ? officialCatalog.subjects : [];
      const selected = subjects.find((subject) => subject.courseCode === data.examCode);
      if (selected) {
        data.source = "anna_university";
        data.sourceUrl = officialCatalog.sourceUrl || "";
      }
      const result = await request("/api/exams", "POST", data);
      alert(result.message || "Exam created");
      loadDashboard();
    });

    document.getElementById("repFilterForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const students = await request(`/api/exams/students?semester=${encodeURIComponent(data.semester)}`);
      document.getElementById("studentPicker").innerHTML = table(
        ["Name", "Roll No", "Department", "Semester", "Role", "Action"],
        students.map((student) => `
          <tr>
            <td>${student.name}</td>
            <td>${student.rollNo || ""}</td>
            <td>${student.department || ""}</td>
            <td>${student.semester || ""}</td>
            <td>${student.role}</td>
            <td><button onclick="assignRep('${student.rollNo}','${student.semester}')">Select as Representative</button></td>
          </tr>
        `)
      );
    });

    document.getElementById("facultyBookings").innerHTML = table(
      ["Exam", "Representative", "Date", "Slot", "Hall", "Seats", "Requested At", "Status", "Action"],
      bookings.filter((booking) => booking.status === "pending_faculty").map((booking) => `
        <tr>
          <td>${booking.exam.examName}</td>
          <td>${booking.requestedBy.name}</td>
          <td>${formatDateLabel(booking.examDate)}</td>
          <td>${formatSlotLabel(booking.slot)}</td>
          <td>${booking.hall.hallName}</td>
          <td>${booking.seatsRequested}</td>
          <td>${formatDateTimeLabel(booking.createdAt)}</td>
          <td>${booking.status}</td>
          <td>
            <button onclick="facultyReview('${booking._id}', true)">Approve</button>
            <button class="secondary" onclick="facultyReview('${booking._id}', false)">Reject</button>
          </td>
        </tr>
      `)
    );

    bindProfileForm();
    return;
  }

  if (dash.role === "representative") {
    const exams = await request("/api/exams");
    const catalog = await request("/api/exams/catalog");
    const activeClassBookings = (dash.myBookings || []).filter((booking) => ["pending_faculty", "faculty_approved", "admin_confirmed"].includes(booking.status));
    const representativeCalendarEvents = buildCalendarEvents(dash.myBookings || [], (booking) => ({
      rawDate: booking.examDate,
      dateKey: toDateKey(booking.examDate),
      dateLabel: booking.examDate,
      title: `${booking.exam?.examCode || ""} ${booking.exam?.examName || "Booking"}`.trim(),
      meta: `${booking.hall?.hallName || "Hall"} • ${formatSlotLabel(booking.slot)} • ${booking.status || ""}`,
      variant: booking.status === "admin_confirmed" || booking.status === "faculty_approved" ? "approved" : booking.status?.includes("rejected") ? "rejected" : "pending"
    }));

    dashboardContent.innerHTML = `
      ${renderProfile(dash)}
      ${renderCalendarSection("Representative Booking Calendar", representativeCalendarEvents, "representative-calendar")}
      <div class="section card">
        <h3>Book Exam Hall</h3>
        <p class="select-note">Choose a date first. Only slots that still have hall capacity on that date will appear, and then you can choose a hall from the remaining options.</p>
        ${Array.isArray(exams) && exams.length ? "" : `<div class="notice">No faculty-created exams are available yet for ${dash.department}, Semester ${dash.semester}. Faculty should create or import the exam first.</div>`}
        <form id="createBookingForm" class="row">
          <select name="exam" required>
            <option value="">Select Exam</option>
            ${(Array.isArray(exams) ? exams : []).map((exam) => `<option value="${exam._id}">${exam.examCode} - ${exam.examName}</option>`).join("")}
          </select>
          <input name="examDate" type="date" required>
          <select name="slot" id="slotSelect" required disabled>
            <option value="">Select Date First</option>
          </select>
          <select name="hall" required disabled>
            <option value="">Select Slot First</option>
          </select>
          <input name="seatsRequested" type="number" placeholder="Seats Requested" required>
          <button>Create Booking</button>
        </form>
        <div class="slot-list" id="slotChips">
          <span class="slot-chip">${formatSlotLabel("08:30-10:00")}</span>
          <span class="slot-chip">${formatSlotLabel("10:30-12:00")}</span>
          <span class="slot-chip">${formatSlotLabel("13:30-15:00")}</span>
          <span class="slot-chip">${formatSlotLabel("15:30-17:00")}</span>
        </div>
        <p class="select-note" id="bookingAvailabilityNote">Pick a date first. Only available slots will be shown.</p>
      </div>

      <div class="section card">
        <h3>Anna University Subject Reference</h3>
        ${renderCatalogMeta(catalog)}
        ${
          catalog.supported && Array.isArray(catalog.subjects) && catalog.subjects.length
            ? table(
              ["Code", "Subject", "Category"],
              catalog.subjects.map((subject) => `<tr><td>${subject.courseCode}</td><td>${subject.courseName}</td><td>${subject.category || "-"}</td></tr>`)
            )
            : "<p class='select-note'>No cached official subject list is available for this semester. Faculty can still create exams manually.</p>"
        }
      </div>

      <div class="section card">
        <h3>My Booking Requests</h3>
        ${table(
          ["Exam", "Hall", "Date", "Slot", "Seats", "Requested At", "Faculty Reviewed At", "Admin Reviewed At", "Status"],
          (dash.myBookings || []).map((booking) => `<tr><td>${booking.exam.examName}</td><td>${booking.hall.hallName}</td><td>${formatDateLabel(booking.examDate)}</td><td>${formatSlotLabel(booking.slot)}</td><td>${booking.seatsRequested}</td><td>${formatDateTimeLabel(booking.createdAt)}</td><td>${formatDateTimeLabel(booking.facultyDecisionAt)}</td><td>${formatDateTimeLabel(booking.adminDecisionAt)}</td><td>${booking.status}</td></tr>`)
        )}
      </div>
    `;

    async function refreshSlotAvailability() {
      const form = document.getElementById("createBookingForm");
      const data = Object.fromEntries(new FormData(form).entries());
      const note = document.getElementById("bookingAvailabilityNote");
      const slotSelect = document.getElementById("slotSelect");
      const hallSelect = form.querySelector('select[name="hall"]');
      const slotChips = document.getElementById("slotChips");

      if (!data.examDate) {
        slotSelect.disabled = true;
        hallSelect.disabled = true;
        slotSelect.innerHTML = `<option value="">Select Date First</option>`;
        hallSelect.innerHTML = `<option value="">Select Slot First</option>`;
        note.textContent = "Pick a date first. Only available slots will be shown.";
        slotChips.innerHTML = SLOT_OPTIONS.map((slot) => `<span class="slot-chip">${formatSlotLabel(slot)}</span>`).join("");
        return;
      }

      const slotResults = await Promise.all(
        SLOT_OPTIONS.map(async (slot) => {
          const classConflict = activeClassBookings.find((booking) => booking.examDate === data.examDate && booking.slot === slot);
          if (classConflict) {
            return {
              slot,
              availability: [],
              available: false,
              blockedByClass: true
            };
          }

          const availability = await request(`/api/halls/availability?examDate=${encodeURIComponent(data.examDate)}&slot=${encodeURIComponent(slot)}`);
          if (!Array.isArray(availability)) {
            return { slot, availability: [], available: false };
          }
          return {
            slot,
            availability,
            available: availability.some((hall) => hall.seatsLeft > 0)
          };
        })
      );

      const availableSlots = slotResults.filter((item) => item.available);
      slotSelect.disabled = !availableSlots.length;
      slotSelect.innerHTML = availableSlots.length
        ? `<option value="">Select Slot</option>${availableSlots.map((item) => `<option value="${item.slot}" ${data.slot === item.slot ? "selected" : ""}>${formatSlotLabel(item.slot)}</option>`).join("")}`
        : `<option value="">No Slots Available</option>`;

      slotChips.innerHTML = SLOT_OPTIONS.map((slot) => {
        const matched = slotResults.find((item) => item.slot === slot);
        const className = matched && matched.available ? "slot-chip available" : "slot-chip unavailable";
        const label = matched && matched.blockedByClass ? `${formatSlotLabel(slot)} - class booked` : formatSlotLabel(slot);
        return `<span class="${className}">${label}</span>`;
      }).join("");

      if (!availableSlots.length) {
        hallSelect.disabled = true;
        hallSelect.innerHTML = `<option value="">No Hall Available</option>`;
        note.textContent = `No exam slots are available on ${data.examDate}.`;
        return;
      }

      note.textContent = `${availableSlots.length} slot(s) available on ${data.examDate}.`;

      if (!data.slot || !availableSlots.some((item) => item.slot === data.slot)) {
        hallSelect.disabled = true;
        hallSelect.innerHTML = `<option value="">Select Slot First</option>`;
        return;
      }

      await refreshHallChoices();
    }

    async function refreshHallChoices() {
      const form = document.getElementById("createBookingForm");
      const data = Object.fromEntries(new FormData(form).entries());
      const note = document.getElementById("bookingAvailabilityNote");
      const hallSelect = form.querySelector('select[name="hall"]');

      if (!data.examDate || !data.slot) {
        hallSelect.disabled = true;
        hallSelect.innerHTML = `<option value="">Select Slot First</option>`;
        return;
      }

      const availability = await request(`/api/halls/availability?examDate=${encodeURIComponent(data.examDate)}&slot=${encodeURIComponent(data.slot)}`);
      if (!Array.isArray(availability)) {
        hallSelect.disabled = true;
        hallSelect.innerHTML = `<option value="">Unable To Load Halls</option>`;
        note.textContent = availability.message || "Unable to load hall availability.";
        return;
      }

      const availableHalls = availability.filter((hall) => hall.seatsLeft > 0);
      hallSelect.disabled = !availableHalls.length;
      hallSelect.innerHTML = availableHalls.length
        ? `<option value="">Select Hall</option>${availableHalls.map((hall) => `<option value="${hall._id}">${hall.hallName} - ${hall.seatsLeft}/${hall.capacity} seats left</option>`).join("")}`
        : `<option value="">No Hall Available</option>`;

      note.textContent = availableHalls.length
        ? `${availableHalls.length} hall(s) available for slot ${formatSlotLabel(data.slot)}.`
        : `No halls have seats left for slot ${formatSlotLabel(data.slot)}.`;
    }

    document.querySelector('#createBookingForm input[name="examDate"]').addEventListener("change", async () => {
      await refreshSlotAvailability();
    });
    document.getElementById("slotSelect").addEventListener("change", async () => {
      await refreshHallChoices();
    });

    document.getElementById("createBookingForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      const result = await request("/api/bookings", "POST", data);
      alert(result.message || "Booking created");
      loadDashboard();
    });

    bindProfileForm();
    return;
  }

  if (dash.role === "student") {
    const schedule = await request("/api/bookings/student-schedule/me");
    const studentCalendarEvents = buildCalendarEvents(schedule, (item) => ({
      rawDate: item.examDate,
      dateKey: toDateKey(item.examDate),
      dateLabel: item.examDate,
      title: `${item.exam?.examCode || ""} ${item.exam?.examName || "Exam"}`.trim(),
      meta: `${item.hall?.hallName || "Hall"} • ${formatSlotLabel(item.slot)}`,
      variant: "approved"
    }));
    dashboardContent.innerHTML = `
      ${renderProfile(dash)}
      ${renderCalendarSection("Exam Schedule Calendar", studentCalendarEvents, "student-calendar")}
      <div class="section card">
        <h3>Exam Schedule</h3>
        ${table(
          ["Exam", "Code", "Date", "Slot", "Hall", "Location", "Seat Range"],
          (Array.isArray(schedule) ? schedule : []).map((item) => `<tr><td>${item.exam.examName}</td><td>${item.exam.examCode}</td><td>${formatDateLabel(item.examDate)}</td><td>${formatSlotLabel(item.slot)}</td><td>${item.hall.hallName}</td><td>${item.hall.location}</td><td>${item.seatsAllocatedStart}-${item.seatsAllocatedEnd}</td></tr>`)
        )}
      </div>

      <div class="section card">
        <h3>Reminders</h3>
        ${(dash.notifications || []).map((notification) => `<div class="notice"><strong>${notification.title}</strong><div>${notification.message}</div></div>`).join("") || "<p>No reminders yet.</p>"}
      </div>
    `;

    bindProfileForm();
  }
}

function bindProfileForm() {
  const toggle = document.getElementById("toggleProfileEdit");
  const panel = document.getElementById("profileEditPanel");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      panel.classList.toggle("hidden");
    });
  }

  const form = document.getElementById("profileForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    if (!data.password) delete data.password;
    const result = await request("/api/auth/me", "PATCH", data);
    alert(result.message || "Profile updated");
    loadDashboard();
  });
}

window.facultyReview = async (id, approve) => {
  const remarks = prompt("Remarks") || "";
  const result = await request(`/api/bookings/${id}/faculty-review`, "PATCH", { approve, remarks });
  alert(result.message || "Updated");
  loadDashboard();
};

window.adminConfirm = async (id, confirm) => {
  const remarks = prompt("Remarks") || "";
  const result = await request(`/api/bookings/${id}/admin-confirm`, "PATCH", { confirm, remarks });
  alert(result.message || "Updated");
  loadDashboard();
};

window.assignRep = async (rollNo, semester) => {
  const result = await request("/api/exams/assign-representative", "POST", { rollNo, semester });
  alert(result.message || "Representative assigned");
  loadDashboard();
};

window.editHall = async (id, hallName, capacity, location) => {
  const nextName = prompt("Hall name", hallName);
  if (nextName === null) return;
  const nextCapacity = prompt("Capacity", capacity);
  if (nextCapacity === null) return;
  const nextLocation = prompt("Location", location);
  if (nextLocation === null) return;

  const result = await request(`/api/halls/${id}`, "PATCH", {
    hallName: nextName.trim(),
    capacity: Number(nextCapacity),
    location: nextLocation.trim()
  });
  alert(result.message || "Hall updated");
  loadDashboard();
};

window.changeCalendarMonth = (key, delta) => {
  const cached = calendarCache[key];
  if (!cached) return;
  const next = getMonthStart(calendarState[key] || new Date());
  next.setMonth(next.getMonth() + delta);
  calendarState[key] = next;
  const root = document.querySelector(`[data-calendar-root="${key}"]`);
  if (!root) return;
  root.outerHTML = renderCalendarSection(cached.title, cached.events, key);
};

async function downloadAdminReport(url, extension) {
  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : ""
    }
  });

  if (!response.ok) {
    let message = "Unable to export booking data";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // Keep the default message if the response is not JSON.
    }
    alert(message);
    return;
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  link.href = objectUrl;
  link.download = `booking-data-${today}.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

document.querySelectorAll(".portal-card").forEach((button) => {
  button.addEventListener("click", () => showPortal(button.dataset.portal));
});

document.getElementById("backToPortals").addEventListener("click", () => {
  authCard.classList.add("hidden");
  portalGrid.classList.remove("hidden");
});

document.getElementById("showRegister").addEventListener("click", () => {
  document.getElementById("studentLogin").classList.add("hidden");
  document.getElementById("registerSwitch").classList.add("hidden");
  document.getElementById("studentRegister").classList.remove("hidden");
  authTitle.textContent = "Student Registration";
});

document.getElementById("adminLogin").addEventListener("submit", (event) => {
  event.preventDefault();
  login("/api/auth/admin-login", event.target);
});

document.getElementById("facultyLogin").addEventListener("submit", (event) => {
  event.preventDefault();
  login("/api/auth/faculty-login", event.target);
});

document.getElementById("studentLogin").addEventListener("submit", (event) => {
  event.preventDefault();
  login("/api/auth/student-login", event.target);
});

document.getElementById("studentRegister").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const result = await request("/api/auth/student-register", "POST", data);
  alert(result.message || "Registered");
  event.target.reset();
  document.getElementById("studentRegister").classList.add("hidden");
  document.getElementById("studentLogin").classList.remove("hidden");
  document.getElementById("registerSwitch").classList.remove("hidden");
  authTitle.textContent = "Student / Representative Login";
});

function enhanceStudentRegisterForm() {
  const form = document.getElementById("studentRegister");
  form.innerHTML = `
    <input name="name" placeholder="Name" required>
    <input name="rollNo" placeholder="Roll Number" required>
    <select name="department" required>
      <option value="">Select Department</option>
      ${deptOptions()}
    </select>
    <select name="semester" required>
      <option value="">Select Semester</option>
      ${semOptions()}
    </select>
    <input name="password" type="password" placeholder="Password" required>
    <button>Register</button>
  `;
}

enhanceStudentRegisterForm();

document.getElementById("profileMenuBtn").addEventListener("click", () => {
  profileMenu.classList.toggle("hidden");
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  token = "";
  profileMenu.classList.add("hidden");
  dashboardCard.classList.add("hidden");
  authCard.classList.add("hidden");
  portalGrid.classList.remove("hidden");
});

document.getElementById("themeToggle").addEventListener("click", () => {
  setTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

document.getElementById("themeToggleMenu").addEventListener("click", () => {
  setTheme(document.body.classList.contains("dark") ? "light" : "dark");
  profileMenu.classList.add("hidden");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".profile-menu-wrap")) {
    profileMenu.classList.add("hidden");
  }
});
