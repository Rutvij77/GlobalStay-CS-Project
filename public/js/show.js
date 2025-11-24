let currentImageIndex = 0;

const lightboxElement = document.getElementById("lightbox");
const lightboxOriginalParent = lightboxElement
  ? lightboxElement.parentElement
  : null;

// Opens the lightbox with the selected image
function openLightbox(index) {
  currentImageIndex = parseInt(index);
  const lightboxImage = document.getElementById("lightboxImage");

  if (lightboxElement) {
    document.body.appendChild(lightboxElement);
  }

  if (window.images && window.images[currentImageIndex]) {
    lightboxImage.src = window.images[currentImageIndex];
    lightboxElement.classList.add("active");
    document.body.style.overflow = "hidden";
  } else {
    console.error("Image index out of bounds or images array not found.");
  }
}

// Closes the lightbox when user clicks outside or presses Escape
function closeLightbox(event) {
  const shouldClose = !event || event.target === event.currentTarget;

  if (shouldClose) {
    const lightbox = document.getElementById("lightbox");
    lightbox.classList.remove("active");
    document.body.style.overflow = "auto";

    if (lightboxOriginalParent && lightboxElement) {
      lightboxOriginalParent.appendChild(lightboxElement);
    }
  }
}

// Switches to the next/previous image based on offset
function changeImage(offset) {
  if (window.images && window.images.length > 0) {
    currentImageIndex =
      (currentImageIndex + offset + window.images.length) %
      window.images.length;
    document.getElementById("lightboxImage").src =
      window.images[currentImageIndex];
  }
}

// Moves to the next image
function nextImage(event) {
  if (event) event.stopPropagation();
  changeImage(1);
}

// Moves to the previous image
function prevImage(event) {
  if (event) event.stopPropagation();
  changeImage(-1);
}

// Handles keyboard shortcuts for lightbox (arrows & escape)
document.addEventListener("keydown", function (e) {
  const lightbox = document.getElementById("lightbox");
  if (lightbox && lightbox.classList.contains("active")) {
    if (e.key === "ArrowRight") nextImage(e);
    if (e.key === "ArrowLeft") prevImage(e);
    if (e.key === "Escape") closeLightbox();
  }
});

let touchStartX = 0;

// Detects swipe left/right on mobile to change images
if (lightboxElement) {
  lightboxElement.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches.length === 1) {
        touchStartX = e.changedTouches[0].screenX;
      }
    },
    { passive: true }
  );

  lightboxElement.addEventListener("touchend", function (e) {
    if (e.changedTouches.length === 1) {
      const touchEndX = e.changedTouches[0].screenX;
      const swipeThreshold = 50;
      const swipeDistance = touchEndX - touchStartX;

      if (Math.abs(swipeDistance) > swipeThreshold) {
        e.stopPropagation();
        if (swipeDistance < 0) {
          nextImage(e);
        } else {
          prevImage(e);
        }
      }
    }
  });
}

// Formats a given date into a readable format
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

document.addEventListener("DOMContentLoaded", () => {
  const modalOriginalParents = {};

  // Moves modal into body and shows/hides it
  function teleportModal(modalId, shouldOpen) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    if (shouldOpen) {
      if (!modalOriginalParents[modalId]) {
        modalOriginalParents[modalId] = modalElement.parentElement;
      }
      document.body.appendChild(modalElement);
      modalElement.style.display = "flex";
      document.body.style.overflow = "hidden";
    } else {
      modalElement.style.display = "none";
      const originalParent = modalOriginalParents[modalId];
      if (originalParent) {
        originalParent.appendChild(modalElement);
      }
      document.body.style.overflow = "auto";
    }
  }

  // Opens description modal
  window.showDescriptionModal = function () {
    teleportModal("descriptionModal", true);
  };

  // Opens amenities modal
  window.showAllAmenities = function () {
    teleportModal("amenitiesModal", true);
  };

  // Closes any modal by ID
  window.closeModal = function (modalId) {
    teleportModal(modalId, false);
  };
});

document.addEventListener("DOMContentLoaded", () => {
  if (!window.bookingData) {
    console.error(
      "bookingData object not found. Make sure it's defined in your EJS template."
    );
    return;
  }

  // Get all DOM elements
  const checkinDesktop = document.getElementById("checkinInput");
  const checkoutDesktop = document.getElementById("checkoutInput");
  const guestsDesktop = document.getElementById("guestsInput");

  const checkinMobile = document.getElementById("checkinInputMobile");
  const checkoutMobile = document.getElementById("checkoutInputMobile");
  const guestsMobile = document.getElementById("guestsInputMobile");

  const validationDesktop = document.getElementById("desktopValidationMessage");
  const validationMobile = document.getElementById("mobileValidationMessage");
  const guestErrorDesktop = document.getElementById("desktopGuestError");
  const guestErrorMobile = document.getElementById("mobileGuestError");

  const priceDisplays = document.querySelectorAll(".price-display");
  const reserveButtons = document.querySelectorAll(".reserve-btn");

  const modalOriginalParents = {};
  function teleportModal(modalId, shouldOpen) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;
    if (shouldOpen) {
      if (!modalOriginalParents[modalId])
        modalOriginalParents[modalId] = modalElement.parentElement;
      document.body.appendChild(modalElement);
      modalElement.style.display = "flex";
      document.body.style.overflow = "hidden";
    } else {
      modalElement.style.display = "none";
      const originalParent = modalOriginalParents[modalId];
      if (originalParent) originalParent.appendChild(modalElement);
      document.body.style.overflow = "auto";
    }
  }

  // Closes confirmation popup
  window.cancelReservation = function () {
    teleportModal("confirmationPopup", false);
  };

  // Confirms reservation and closes popup
  window.confirmReservation = function () {
    alert("Reservation Confirmed!");
    teleportModal("confirmationPopup", false);
  };

  // Helper Functions
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function showDateError(message) {
    validationDesktop.innerText = message;
    validationMobile.innerText = message;
    validationDesktop.style.display = "block";
    validationMobile.style.display = "block";
  }

  function clearDateError() {
    validationDesktop.style.display = "none";
    validationMobile.style.display = "none";
  }

  function showGuestError(message) {
    guestErrorDesktop.innerText = message;
    guestErrorMobile.innerText = message;
    guestErrorDesktop.style.display = "block";
    guestErrorMobile.style.display = "block";
  }

  function clearGuestError() {
    guestErrorDesktop.style.display = "none";
    guestErrorMobile.style.display = "none";
  }

  // Calculates total nights and price based on selected dates
  function updateTotalDaysAndPrice() {
    const checkinValue = checkinDesktop.value;
    const checkoutValue = checkoutDesktop.value;

    if (
      checkinValue &&
      checkoutValue &&
      new Date(checkoutValue) > new Date(checkinValue)
    ) {
      const checkinDate = new Date(checkinValue);
      const checkoutDate = new Date(checkoutValue);
      const timeDifference = checkoutDate.getTime() - checkinDate.getTime();
      const newDays = Math.ceil(timeDifference / (1000 * 3600 * 24));

      if (newDays > 0) {
        window.bookingData.totalDays = newDays;
        const total = window.bookingData.price * newDays;
        const formattedTotal = total.toLocaleString("en-IN");

        priceDisplays.forEach((display) => {
          display.innerHTML = `<strong>&#8377; ${formattedTotal}</strong> for ${newDays} night${
            newDays > 1 ? "s" : ""
          }`;
        });
      }
    }
  }

  // Validates all booking form inputs (dates & guests)
  function validateAllInputs() {
    clearDateError();
    clearGuestError();

    let isDateValid = false;
    let isGuestValid = false;

    const checkinValue = checkinDesktop.value;
    const checkoutValue = checkoutDesktop.value;

    if (
      checkinValue &&
      checkoutValue &&
      new Date(checkoutValue) > new Date(checkinValue)
    ) {
      isDateValid = true;
    } else {
      showDateError("Please select a valid check-in and check-out range.");
    }

    const guests = parseInt(guestsDesktop.value);
    const maxGuests = window.bookingData.maxGuests;

    if (!guests || guests < 1) {
      showGuestError("Please enter at least 1 guest.");
    } else if (guests > maxGuests) {
      showGuestError(`Maximum ${maxGuests} guests allowed.`);
    } else {
      isGuestValid = true;
    }

    const isFormValid = isDateValid && isGuestValid;
    reserveButtons.forEach((btn) => (btn.disabled = !isFormValid));
    return isFormValid;
  }

  // Handles reservation button click
  window.reserve = function () {
    if (String(window.bookingData.isOwnerUser) === "true") {
      showDateError("Owners cannot reserve their own listing.");
      return;
    }
    if (String(window.bookingData.currUser) !== "true") {
      showDateError("You must be logged in to make a reservation.");
      return;
    }
    if (!validateAllInputs()) {
      return;
    }

    const checkin = checkinDesktop.value;
    const checkout = checkoutDesktop.value;
    const guests = guestsDesktop.value;
    const nights = window.bookingData.totalDays;
    const total = window.bookingData.price * nights;

    const confirmationDetails = document.getElementById("confirmationDetails");
    if (confirmationDetails) {
      confirmationDetails.innerHTML = `
        <div class="confirmation-row">
          <span class="confirmation-label">Check-in:</span>
          <span class="confirmation-value">${formatVerboseDate(checkin)}</span>
          <input type="hidden" name="booking[checkIn]" value="${checkin}">
        </div>
        <div class="confirmation-row">
          <span class="confirmation-label">Check-out:</span>
          <span class="confirmation-value">${formatVerboseDate(checkout)}</span>
          <input type="hidden" name="booking[checkOut]" value="${checkout}">
        </div>
        <div class="confirmation-row">
          <span class="confirmation-label">Guests:</span>
          <span class="confirmation-value">${guests}</span>
          <input type="hidden" name="booking[guests]" value="${guests}">
        </div>
        <div class="confirmation-row">
          <span class="confirmation-label">Nights:</span>
          <span class="confirmation-value">${nights}</span>
        </div>
        <div class="confirmation-row">
          <span class="confirmation-label">Total Price:</span>
          <span class="confirmation-value">&#8377; ${total.toLocaleString(
            "en-IN"
          )}</span>
          <input type="hidden" name="booking[totalAmount]" value="${total}">
        </div>
      `;
    }
    teleportModal("confirmationPopup", true);
  };

  const bookedDateRanges = Array.isArray(window.bookingData.bookedDates)
    ? window.bookingData.bookedDates.map((range) => {
        const startDate = new Date(range.start);
        startDate.setDate(startDate.getDate() - 1);
        return {
          from: startDate,
          to: new Date(range.end),
        };
      })
    : [];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const flatpickrConfig = {
    mode: "range",
    minDate: tomorrow,
    dateFormat: "Y-m-d",
    disable: bookedDateRanges,
    onDayCreate: function (dObj, dStr, fp, dayElem) {
      for (const range of bookedDateRanges) {
        if (dayElem.dateObj >= range.from && dayElem.dateObj <= range.to) {
          dayElem.classList.add("booked");
        }
      }

      if (fp.selectedDates.length === 1) {
        const selectedDate = fp.selectedDates[0];

        let nextBookingStart = null;
        for (const range of bookedDateRanges) {
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
        for (const range of bookedDateRanges) {
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
        showDateError("Check-in and check-out dates cannot be the same.");
        return;
      }

      if (selectedDates.length === 1) {
        const checkinStr = formatDate(selectedDates[0]);
        checkinDesktop.value = checkinStr;
        checkinMobile.value = checkinStr;
        checkoutDesktop.value = "";
        checkoutMobile.value = "";
        instance.redraw();
      }

      if (selectedDates.length === 2) {
        const checkinStr = formatDate(selectedDates[0]);
        const checkoutStr = formatDate(selectedDates[1]);

        checkinDesktop.value = checkinStr;
        checkoutDesktop.value = checkoutStr;
        checkinMobile.value = checkinStr;
        checkoutMobile.value = checkoutStr;
      }

      updateTotalDaysAndPrice();
      validateAllInputs();
    },
  };

  const desktopCalendar = flatpickr(checkinDesktop, flatpickrConfig);
  const mobileCalendar = flatpickr(checkinMobile, flatpickrConfig);

  checkoutDesktop.addEventListener("click", () => desktopCalendar.open());
  checkoutMobile.addEventListener("click", () => mobileCalendar.open());

  // Event listener for the GUESTS input
  function handleGuestChange() {
    guestsMobile.value = guestsDesktop.value;
    validateAllInputs();
  }
  guestsDesktop.addEventListener("input", handleGuestChange);
  guestsMobile.addEventListener("input", () => {
    guestsDesktop.value = guestsDesktop.value;
    validateAllInputs();
  });

  // Initial page load validation
  validateAllInputs();
});

document.addEventListener("DOMContentLoaded", () => {
  const modalOriginalParents = {};

  // Reusable function to open/close review modals
  function teleportModal(modalId, shouldOpen) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      console.error(`Modal with ID "${modalId}" not found.`);
      return;
    }

    if (shouldOpen) {
      if (!modalOriginalParents[modalId]) {
        modalOriginalParents[modalId] = modalElement.parentElement;
      }
      document.body.appendChild(modalElement);
      modalElement.style.display = "flex";
      document.body.style.overflow = "hidden";
    } else {
      modalElement.style.display = "none";
      const originalParent = modalOriginalParents[modalId];
      if (originalParent) {
        originalParent.appendChild(modalElement);
      }
      document.body.style.overflow = "auto";
    }
  }

  // Opens "Add Review" modal
  window.showAddReviewModal = function () {
    teleportModal("addReviewModal", true);
  };

  // Opens "All Reviews" modal
  window.showAllReviewsModal = function () {
    teleportModal("allReviewsModal", true);
  };

  // Closes any modal by ID
  window.closeModal = function (modalId) {
    teleportModal(modalId, false);
  };
});

const listingLocation = window.listingLocation;

// MAP INITIALIZATION
// Initializes map with location marker
const coordinates = [
  listingLocation.coordinates[1],
  listingLocation.coordinates[0],
];

// Initialize the map and set its view
var map = L.map("map").setView(coordinates, 16);

// Add the OpenStreetMap tile layer
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
}).addTo(map);

// Create the custom home icon for the marker
var homeDivIcon = L.divIcon({
  className: "custom-div-icon",
  html: '<div class="home-icon-marker"><i class="fa-solid fa-house"></i></div>',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Add the marker to the map
var marker = L.marker(coordinates, { icon: homeDivIcon })
  .addTo(map)
  .bindPopup("Your stay will be right nearby this spot")
  .openPopup();
