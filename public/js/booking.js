let currentDate = new Date();

const today = new Date();
today.setHours(0, 0, 0, 0);

// Start the app
function init() {
  populateYearSelector();
  setupEventListeners();
  updateView();
}

// Handle all button clicks and user actions
function setupEventListeners() {
  // Go to previous month
  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateView();
  });

  // Go to next month
  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateView();
  });

  // Show/hide the month/year picker when clicking the display
  document
    .getElementById("control-month-year-display")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMonthYearPicker();
    });

  const picker = document.getElementById("month-year-picker");
  if (picker) {
    picker.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // Apply selected month/year
  document.getElementById("picker-apply").addEventListener("click", (e) => {
    e.stopPropagation();
    applyMonthYearChange();
  });

  // Cancel month/year selection
  document.getElementById("picker-cancel").addEventListener("click", (e) => {
    e.stopPropagation();
    hideMonthYearPicker();
  });

  // Close picker when clicking outside
  document.addEventListener("click", () => {
    const picker = document.getElementById("month-year-picker");
    if (picker.classList.contains("show")) {
      hideMonthYearPicker();
    }
  });
}

// Refresh calendar, table, and month display
function updateView() {
  generateCalendar(currentDate);
  loadBookingsTable(currentDate);
  updateMonthYearDisplay(currentDate);
  updateCalendarDisplay(currentDate);
}

// Turn a date string into a local Date object
function parseAsLocalDate(dateString) {
  if (!dateString) return null;
  const parts = dateString.split("T")[0].split("-");
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Build the calendar grid for a given month
function generateCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const calendarGrid = document.getElementById("calendar-grid");
  calendarGrid.innerHTML = "";

  const bookedDates = getBookedDatesWithStatus(year, month, today);

  let currentDay = new Date(firstDayOfMonth);
  currentDay.setDate(currentDay.getDate() - firstDayOfWeek);

  for (let i = 0; i < 42; i++) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = currentDay.getDate();

    if (currentDay.getMonth() !== month) {
      dayElement.classList.add("other-month");
    } else {
      const dateStr = `${currentDay.getFullYear()}-${String(
        currentDay.getMonth() + 1
      ).padStart(2, "0")}-${String(currentDay.getDate()).padStart(2, "0")}`;

      if (bookedDates.has(dateStr)) {
        dayElement.classList.add(bookedDates.get(dateStr));
      }
      if (currentDay.getTime() === today.getTime()) {
        dayElement.classList.add("today");
      }
    }
    calendarGrid.appendChild(dayElement);
    currentDay.setDate(currentDay.getDate() + 1);
  }
}

// Find which dates are booked and mark them with status
function getBookedDatesWithStatus(year, month, today) {
  const bookedDates = new Map();
  if (!bookings || bookings.length === 0) {
    return bookedDates;
  }

  bookings.forEach((booking) => {
    if (!booking || !booking.status) {
      return;
    }

    const status = booking.status.toLowerCase();

    if (status === "canceled") {
      return;
    }

    const checkIn = parseAsLocalDate(booking.checkIn);
    const checkOut = parseAsLocalDate(booking.checkOut);

    if (!checkIn || !checkOut) {
      return;
    }

    let statusClass = "";
    if (status === "completed") {
      statusClass = "completed";
    } else if (status === "confirmed") {
      if (checkIn < today && checkOut >= today) {
        statusClass = "ongoing";
      } else {
        statusClass = "upcoming";
      }
    }

    if (statusClass) {
      let loopDate = new Date(checkIn.getTime());
      while (loopDate <= checkOut) {
        if (loopDate.getFullYear() === year && loopDate.getMonth() === month) {
          const dateStr = `${loopDate.getFullYear()}-${String(
            loopDate.getMonth() + 1
          ).padStart(2, "0")}-${String(loopDate.getDate()).padStart(2, "0")}`;
          bookedDates.set(dateStr, statusClass);
        }
        loopDate.setDate(loopDate.getDate() + 1);
      }
    }
  });

  return bookedDates;
}

// Fill the bookings table for the selected month
function loadBookingsTable(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (!bookings) {
    populateTable("bookings-tbody", []);
    return;
  }

  const monthBookings = bookings.filter((booking) => {
    if (!booking || !booking.checkIn || !booking.checkOut) return false;

    const checkIn = parseAsLocalDate(booking.checkIn);
    const checkOut = parseAsLocalDate(booking.checkOut);
    if (!checkIn || !checkOut) return false;

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return checkIn <= monthEnd && checkOut >= monthStart;
  });

  const isCurrentMonth =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth();

  if (isCurrentMonth) {
    // Apply the special sorting rules for the current month
    monthBookings.sort((a, b) => {
      const aCheckIn = parseAsLocalDate(a.checkIn);
      const bCheckIn = parseAsLocalDate(b.checkIn);
      const aCheckOut = parseAsLocalDate(a.checkOut);
      const bCheckOut = parseAsLocalDate(b.checkOut);

      // Assign a priority number to each booking status
      const getStatusPriority = (checkIn, checkOut) => {
        if (checkIn <= today && checkOut >= today) return 1; // 1. Ongoing
        if (checkIn > today) return 2; // 2. Upcoming
        return 3; // 3. Completed
      };

      const aPriority = getStatusPriority(aCheckIn, aCheckOut);
      const bPriority = getStatusPriority(bCheckIn, bCheckOut);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return aCheckIn - bCheckIn;
    });
  } else {
    // For all other months, use a simple ascending sort by check-in date
    monthBookings.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
  }

  populateTable("bookings-tbody", monthBookings);
}

// Render booking rows into the table
function populateTable(tbodyId, data) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><h3>No bookings found</h3><p>There are no bookings for this month.</p></td></tr>`;
    return;
  }

  data.forEach((booking) => {
    const username = booking.guestName || "Unknown User";
    const guests = booking.guests || 0;

    const price =
      typeof booking.totalAmount === "number"
        ? `₹ ${booking.totalAmount.toLocaleString("en-IN")}`
        : "N/A";

    const displayStatus = booking.status || "unknown";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="username">${username}</td>
      <td>
        <div class="date-info">
          <span class="check-in">${formatDate(booking.checkIn)}</span>
          <span class="check-out">${formatDate(booking.checkOut)}</span>
        </div>
      </td>
      <td class="guests">${guests} ${guests === 1 ? "Guest" : "Guests"}</td>
      <td class="price">${price}</td>
      <td><span class="status ${displayStatus.toLowerCase()}">${displayStatus}</span></td>`;
    tbody.appendChild(row);
  });
}

// Format a date nicely (DD MMM YYYY)
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Update text above month selector
function updateMonthYearDisplay(date) {
  const monthYearString = date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const textElement = document.getElementById("month-year-text");
  if (textElement) {
    textElement.textContent = monthYearString;
  }
}

// Update text above calendar grid
function updateCalendarDisplay(date) {
  const monthYearString = date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  document.getElementById("calendar-month-display").textContent =
    monthYearString;
}

// Show/hide the month/year picker
function toggleMonthYearPicker() {
  const picker = document.getElementById("month-year-picker");
  picker.classList.toggle("show");
  if (picker.classList.contains("show")) {
    updateMonthYearSelectors();
  }
}

// Hide the month/year picker
function hideMonthYearPicker() {
  document.getElementById("month-year-picker").classList.remove("show");
}

// Fill year dropdown with values (±5 years around current year)
function populateYearSelector() {
  const yearSelect = document.getElementById("year-select");
  if (!yearSelect) return;
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    yearSelect.appendChild(option);
  }
}

// Sync dropdown values with current date
function updateMonthYearSelectors() {
  document.getElementById("month-select").value = currentDate.getMonth();
  document.getElementById("year-select").value = currentDate.getFullYear();
}

// Apply selected month/year and refresh calendar
function applyMonthYearChange() {
  const month = parseInt(document.getElementById("month-select").value);
  const year = parseInt(document.getElementById("year-select").value);
  currentDate = new Date(year, month, 1);
  updateView();
  hideMonthYearPicker();
}

// Run the app after the page is ready
document.addEventListener("DOMContentLoaded", init);
