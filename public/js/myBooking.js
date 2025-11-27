// Modal elements
const viewBookingModal = document.getElementById("view-booking-modal");
const cancelConfirmationModal = document.getElementById(
  "cancel-confirmation-modal"
);
const updateBookingModal = document.getElementById("update-booking-modal");
const confirmUpdateModal = document.getElementById("confirm-update-modal");

let currentBookingId = null;

// Show either current or previous bookings table
function showTable(tableType) {
  document.getElementById("current-table").classList.add("hidden");
  document.getElementById("previous-table").classList.add("hidden");

  const buttons = document.querySelectorAll(".toggle-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));

  document.getElementById(`${tableType}-table`).classList.remove("hidden");

  const activeBtn = document.querySelector(
    `.toggle-btn[data-type="${tableType}"]`
  );
  if (activeBtn) activeBtn.classList.add("active");
}

// Show correct table on page load
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".toggle-btn[data-type='current']")) {
    showTable("current");
  } else if (document.querySelector(".toggle-btn[data-type='previous']")) {
    showTable("previous");
  }
});

// Show a modal
function showModal(modalId) {
  let modalElement;
  if (modalId === "view-booking-modal") {
    modalElement = viewBookingModal;
  } else if (modalId === "cancel-confirmation-modal") {
    modalElement = cancelConfirmationModal;
  } else if (modalId === "update-booking-modal") {
    modalElement = updateBookingModal;
  } else if (modalId === "confirm-update-modal") {
    modalElement = confirmUpdateModal;
  }

  if (modalElement) {
    document.body.appendChild(modalElement);
    modalElement.classList.add("show");
    document.body.style.overflow = "hidden";
  }
}

// Close a modal
function closeModal(modalId) {
  let modalElement;
  if (modalId === "view-booking-modal") {
    modalElement = viewBookingModal;
  } else if (modalId === "cancel-confirmation-modal") {
    modalElement = cancelConfirmationModal;
  } else if (modalId === "update-booking-modal") {
    modalElement = updateBookingModal;
  } else if (modalId === "confirm-update-modal") {
    modalElement = confirmUpdateModal;
  }

  if (modalElement) {
    modalElement.classList.remove("show");
    document.body.style.overflow = "";
  }
}

// Go back to update modal from confirmation modal
function backToUpdateModal() {
  closeModal("confirm-update-modal");
  showModal("update-booking-modal");
}

// Show details of a specific booking in the modal
function showBookingDetails(bookingId) {
  const booking = bookingsData[bookingId];
  console.log("Data object for this booking:", booking);
  if (!booking) {
    console.error("Booking data not found for ID:", bookingId);
    return;
  }

  currentBookingId = bookingId;

  // Fill modal with booking details
  document.getElementById("modal-listing-photo").src =
    booking.listing.thumbnail.url;
  document.getElementById("modal-listing-photo").alt = booking.listing.title;
  document.getElementById("modal-listing-title").textContent =
    booking.listing.title;
  document.getElementById("modal-listing-city").textContent =
    booking.listing.address.city;
  document.getElementById("modal-username").textContent = booking.guestName;
  document.getElementById("modal-guests").textContent = `${booking.guests} ${
    booking.guests > 1 ? "Guests" : "Guest"
  }`;
  document.getElementById("modal-checkin").textContent =
    booking.checkInFormatted;
  document.getElementById("modal-checkout").textContent =
    booking.checkOutFormatted;
  document.getElementById(
    "modal-total"
  ).innerHTML = `&#8377; ${booking.totalAmount.toLocaleString("en-IN")}`;

  const statusElement = document.getElementById("modal-status");
  statusElement.textContent =
    booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
  statusElement.className = `detail-value status ${booking.status}`;

  const cancelBtn = document.getElementById("modal-cancel-btn");
  const updateBtn = document.getElementById("modal-update-btn");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isCancellable = new Date(booking.checkIn) > today;
  if (isCancellable && booking.status !== "canceled") {
    cancelBtn.style.display = "inline-block";
    updateBtn.style.display = "inline-block";
  } else {
    cancelBtn.style.display = "none";
    updateBtn.style.display = "none";
  }

  const viewListingBtn = document.querySelector(
    "#view-booking-modal .modal-footer .btn-outline-secondary"
  );
  viewListingBtn.onclick = () => {
    window.location.href = `/listings/${booking.listing._id}`;
  };

  showModal("view-booking-modal");
}

// Format date as YYYY-MM-DD
function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Validate booking changes before updating
function validateAndUpdate(booking) {
  const checkinInput = document.getElementById("update-checkin-input");
  const checkoutInput = document.getElementById("update-checkout-input");
  const guestsInput = document.getElementById("update-guests-input");
  const reviewChangesBtn = document.getElementById("review-changes-btn");
  const errorContainer = document.getElementById("update-form-error-message");
  const originalPriceEl = document.getElementById("original-price");
  const newPriceEl = document.getElementById("new-price");
  const totalNights = document.getElementById("total-nights");
  const priceDifferenceEl = document.getElementById("price-difference-message");

  function displayError(message) {
    errorContainer.style.display = "block";
    errorContainer.textContent = message;
    reviewChangesBtn.disabled = true;
    newPriceEl.textContent = "—";
    totalNights.textContent = "-";
    priceDifferenceEl.textContent = "";
    priceDifferenceEl.classList.remove("charge", "refund");
  }

  function clearError() {
    errorContainer.textContent = "";
    errorContainer.style.display = "none";
    reviewChangesBtn.disabled = false;
  }

  clearError();

  const maxGuests = booking.listing.details.guests;
  const currentGuests = parseInt(guestsInput.value, 10);

  originalPriceEl.textContent = `₹ ${Number(booking.totalAmount).toLocaleString(
    "en-IN"
  )}`;

  if (!checkinInput.value || !checkoutInput.value) {
    displayError("Please select a check-in and check-out date.");
    return false;
  }

  const checkinDate = new Date(checkinInput.value + "T00:00:00");
  const checkoutDate = new Date(checkoutInput.value + "T00:00:00");

  if (checkoutDate <= checkinDate) {
    displayError("Check-out date must be after the check-in date.");
    return false;
  }
  if (isNaN(currentGuests) || currentGuests < 1 || currentGuests > maxGuests) {
    displayError(`Number of guests must be between 1 and ${maxGuests}.`);
    guestsInput.classList.add("is-invalid");
    return false;
  } else {
    guestsInput.classList.remove("is-invalid");
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  const nights = Math.round(
    (checkoutDate.getTime() - checkinDate.getTime()) / msPerDay
  );

  const newTotalPrice = booking.listing.price * nights;
  const originalTotalPrice = Number(booking.totalAmount);
  const difference = newTotalPrice - originalTotalPrice;

  newPriceEl.textContent = `₹ ${newTotalPrice.toLocaleString("en-IN")}`;
  totalNights.textContent = nights;
  priceDifferenceEl.classList.remove("charge", "refund");

  if (difference > 0) {
    priceDifferenceEl.textContent = `An additional payment of ₹ ${difference.toLocaleString(
      "en-IN"
    )} is required.`;
    priceDifferenceEl.classList.add("charge");
  } else if (difference < 0) {
    priceDifferenceEl.textContent = `A refund of ₹ ${Math.abs(
      difference
    ).toLocaleString("en-IN")} will be issued.`;
    priceDifferenceEl.classList.add("refund");
  } else {
    priceDifferenceEl.textContent = "The total price has not changed.";
  }

  reviewChangesBtn.disabled = false;

  clearError();
  return {
    valid: true,
    checkinDate: checkinDate,
    checkoutDate: checkoutDate,
    guests: currentGuests,
    nights: nights,
    newTotalPrice: newTotalPrice,
    difference: difference,
  };
}

// Open modal to update booking details
async function openUpdateModal() {
  const booking = bookingsData[currentBookingId];
  if (!booking) {
    return;
  }

  const checkinInput = document.getElementById("update-checkin-input");
  const checkoutInput = document.getElementById("update-checkout-input");
  const guestsInput = document.getElementById("update-guests-input");
  const reviewChangesBtn = document.getElementById("review-changes-btn");

  checkinInput.value = formatDate(booking.checkIn);
  checkoutInput.value = formatDate(booking.checkOut);
  guestsInput.value = booking.guests;

  document.getElementById("original-price").textContent = `₹ ${Number(
    booking.totalAmount
  ).toLocaleString("en-IN")}`;
  document.getElementById("new-price").textContent = "—";
  document.getElementById("total-nights").textContent = "-";
  document.getElementById("price-difference-message").textContent = "";
  document.getElementById("update-form-error-message").style.display = "none";
  reviewChangesBtn.disabled = true;

  try {
    // Fetch the unavailable dates from our new API, excluding the current booking
    const listingId = booking.listing._id;
    const bookingId = booking._id;
    const fetchURL = `/listings/${listingId}/booked-dates/${bookingId}`;

    const response = await fetch(fetchURL);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const bookedDateRanges = await response.json();

    const unavailableRanges = bookedDateRanges.map((range) => {
      const startDate = new Date(range.start);
      startDate.setDate(startDate.getDate() - 1);
      return {
        from: startDate,
        to: new Date(range.end),
      };
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const flatpickrConfig = {
      mode: "range",
      minDate: tomorrow,
      dateFormat: "Y-m-d",
      disable: unavailableRanges,
      onDayCreate: function (dObj, dStr, fp, dayElem) {
        for (const range of unavailableRanges) {
          if (dayElem.dateObj >= range.from && dayElem.dateObj <= range.to) {
            dayElem.classList.add("booked");
          }
        }

        if (fp.selectedDates.length === 1) {
          const selectedDate = fp.selectedDates[0];

          let nextBookingStart = null;
          for (const range of unavailableRanges) {
            if (range.from > selectedDate) {
              if (!nextBookingStart || range.from < nextBookingStart) {
                nextBookingStart = range.from;
              }
            }
          }
          if (nextBookingStart && dayElem.dateObj >= nextBookingStart) {
            dayElem.classList.add("booked");
          }

          let previousBookingEnd = null;
          for (const range of unavailableRanges) {
            if (range.to < selectedDate) {
              if (!previousBookingEnd || range.to > previousBookingEnd) {
                previousBookingEnd = range.to;
              }
            }
          }
          if (previousBookingEnd && dayElem.dateObj <= previousBookingEnd) {
            dayElem.classList.add("booked");
          }
        }
      },
      onValueUpdate: function (selectedDates, dateStr, instance) {
        if (selectedDates.length === 1) {
          instance.redraw();
        }
      },
      onChange: function (selectedDates, dateStr, instance) {
        if (
          selectedDates.length === 2 &&
          selectedDates[0].getTime() === selectedDates[1].getTime()
        ) {
          instance.clear();
          document.getElementById("update-form-error-message").style.display =
            "block";
          document.getElementById("update-form-error-message").textContent =
            "Check-in and check-out dates cannot be the same.";
          return;
        }

        if (selectedDates.length === 1) {
          checkinInput.value = formatDate(selectedDates[0]);
          checkoutInput.value = "";
          instance.redraw();
        } else if (selectedDates.length === 2) {
          checkinInput.value = formatDate(selectedDates[0]);
          checkoutInput.value = formatDate(selectedDates[1]);
        }
        validateAndUpdate(booking);
      },
    };

    const checkinPicker = flatpickr(checkinInput, flatpickrConfig);
    checkoutInput.addEventListener("click", () => checkinPicker.open());
  } catch (error) {
    console.error(
      "Failed to fetch booked dates or initialize calendar:",
      error
    );
  }

  guestsInput.removeEventListener("input", () => validateAndUpdate(booking));
  guestsInput.addEventListener("input", () => validateAndUpdate(booking));
  checkinInput.addEventListener("change", () => validateAndUpdate(booking));
  checkoutInput.addEventListener("change", () => validateAndUpdate(booking));

  validateAndUpdate(booking);

  closeModal("view-booking-modal");
  showModal("update-booking-modal");
}

// Format date for verbose display like "Tue, Jan 2, 2024"
function formatVerboseDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  return d.toLocaleDateString("en-US", options);
}

// Show confirmation modal after changes review
function showUpdateConfirmation(event) {
  event.preventDefault();

  const booking = bookingsData[currentBookingId];

  let validation = validateAndUpdate(booking);
  if (!validation || validation.valid !== true) {
    console.log("Validation error");
    return;
  }

  const {
    checkinDate,
    checkoutDate,
    guests,
    nights,
    newTotalPrice,
    difference,
  } = validation;

  const originalNights = Math.round(
    (new Date(booking.checkOut) - new Date(booking.checkIn)) /
      (1000 * 60 * 60 * 24)
  );
  const fromDatesEl = document.getElementById("from-dates");
  const toDatesEl = document.getElementById("to-dates");
  const fromGuestsEl = document.getElementById("from-guests");
  const toGuestsEl = document.getElementById("to-guests");
  const fromNightsEl = document.getElementById("from-nights");
  const toNightsEl = document.getElementById("to-nights");
  const fromPriceEl = document.getElementById("from-price");
  const toPriceEl = document.getElementById("to-price");

  fromDatesEl.textContent = `${booking.checkInFormatted} → ${booking.checkOutFormatted}`;
  toDatesEl.textContent = `${formatVerboseDate(
    checkinDate
  )} → ${formatVerboseDate(checkoutDate)}`;
  fromGuestsEl.textContent = `${booking.guests} Guests`;
  toGuestsEl.textContent = `${guests} Guests`;
  if (fromNightsEl) fromNightsEl.textContent = `${originalNights} Nights`;
  if (toNightsEl) toNightsEl.textContent = `${nights} Nights`;
  fromPriceEl.innerHTML = `₹ ${booking.totalAmount.toLocaleString("en-IN")}`;
  toPriceEl.innerHTML = `₹ ${newTotalPrice.toLocaleString("en-IN")}`;

  document
    .querySelectorAll(".comparison-row")
    .forEach((row) => row.classList.remove("has-changed"));

  const markAsChanged = (element) => {
    if (element) {
      const row = element.closest(".comparison-row");
      if (row) {
        row.classList.add("has-changed");
      }
    }
  };

  if (fromDatesEl.textContent !== toDatesEl.textContent)
    markAsChanged(fromDatesEl);
  if (fromGuestsEl.textContent !== toGuestsEl.textContent)
    markAsChanged(fromGuestsEl);
  if (fromNightsEl.textContent !== toNightsEl.textContent)
    markAsChanged(fromNightsEl);
  if (fromPriceEl.innerHTML !== toPriceEl.innerHTML) markAsChanged(fromPriceEl);

  const finalImpactEl = document.getElementById("final-impact-message");
  finalImpactEl.classList.remove("charge", "refund");
  if (difference > 0) {
    finalImpactEl.textContent = `An additional payment of ₹ ${difference.toLocaleString(
      "en-IN"
    )} is required.`;
    finalImpactEl.classList.add("charge");
  } else if (difference < 0) {
    finalImpactEl.textContent = `A refund of ₹ ${Math.abs(
      difference
    ).toLocaleString("en-IN")} will be issued.`;
    finalImpactEl.classList.add("refund");
  } else {
    finalImpactEl.textContent = "The total price is unchanged.";
  }

  document.getElementById("hidden-checkIn").value = formatDate(checkinDate);
  document.getElementById("hidden-checkOut").value = formatDate(checkoutDate);
  document.getElementById("hidden-guests").value = Number(guests);
  document.getElementById("hidden-totalAmount").value = Number(newTotalPrice);

  const confirmUpdateForm = document.getElementById("update-confirm-form");
  confirmUpdateForm.action = `/listings/${booking.listing._id}/bookings/${booking._id}/update?_method=PUT`;

  // Switch from the update modal to the confirmation modal
  closeModal("update-booking-modal");
  showModal("confirm-update-modal");
}

const updateBookingForm = document.getElementById("update-booking-form");
if (updateBookingForm) {
  updateBookingForm.removeEventListener("submit", showUpdateConfirmation);
  updateBookingForm.addEventListener("submit", showUpdateConfirmation);
} else {
  console.warn(
    "update-booking-form not found — ensure the script runs after the form is in the DOM."
  );
}

// Show cancel confirmation modal
function showCancelConfirmation() {
  const booking = bookingsData[currentBookingId];
  if (!booking) return;

  document.getElementById("cancel-listing-title").textContent =
    booking.listing.title;
  document.getElementById("cancel-checkin").textContent =
    booking.checkInFormatted;
  document.getElementById("cancel-checkout").textContent =
    booking.checkOutFormatted;
  document.getElementById(
    "cancel-total"
  ).innerHTML = `&#8377; ${booking.totalAmount.toLocaleString("en-IN")}`;

  const cancelForm = document.getElementById("cancel-form");
  cancelForm.action = `/listings/${booking.listing._id}/bookings/${booking._id}/cancel?_method=DELETE`;

  closeModal("view-booking-modal");
  showModal("cancel-confirmation-modal");
}

// Open booking details when clicking table row button
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("view-booking-btn")) {
    const row = e.target.closest("tr");
    const bookingId = row.getAttribute("data-booking-id");
    showBookingDetails(bookingId);
  }
});

// Close modals by clicking outside
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal-overlay")) {
    closeModal(e.target.id);
  }
});

// Close modals with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    const openModal = document.querySelector(".modal-overlay.show");
    if (openModal) {
      closeModal(openModal.id);
    }
  }
});

// Keyboard navigation support
document.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    return;
  }
});
