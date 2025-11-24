// Toggle the user dropdown menu (open/close)
function toggleUserMenu() {
  document.getElementById("userDropdown").classList.toggle("show");
}

// Close user menu when clicking outside
document.addEventListener("click", function (event) {
  const userMenuBtn = document.querySelector(".user-menu-btn");
  const dropdown = document.getElementById("userDropdown");
  if (
    userMenuBtn &&
    !userMenuBtn.contains(event.target) &&
    dropdown &&
    !dropdown.contains(event.target)
  ) {
    dropdown.classList.remove("show");
  }
});

const searchModal = document.getElementById("searchModal");

// Open the search modal and lock page scroll
function openSearchModal() {
  if (searchModal) {
    searchModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
}

// Close the search modal (when background or close is clicked)
function closeSearchModal(event) {
  if (!event || event.target === event.currentTarget) {
    if (searchModal) {
      searchModal.classList.remove("show");
      document.body.style.overflow = "auto";
    }
  }
}

// Close search modal with Escape key
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && searchModal.classList.contains("show")) {
    closeSearchModal();
  }
});

// Add loading state to search form submit button
document.addEventListener("DOMContentLoaded", function () {
  const searchForms = document.querySelectorAll(
    'form[action="/listings/search"]'
  );
  searchForms.forEach((form) => {
    form.addEventListener("submit", function (e) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add("loading");
      }
    });
  });

  let lastScrollTop = 0;
  const navbar = document.querySelector(".navbar");
  window.addEventListener("scroll", function () {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      navbar.style.transform = "translateY(-100%)";
    } else {
      navbar.style.transform = "translateY(0)";
    }
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  });

  const checkinInput = document.getElementById("nav-checkin-input");
  const checkoutInput = document.getElementById("nav-checkout-input");

  if (checkinInput && checkoutInput) {
    const dateContainer = document.getElementById("date-picker-container");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const fp = flatpickr(checkinInput, {
      mode: "range",
      minDate: tomorrow,
      dateFormat: "Y-m-d",

      appendTo: dateContainer,

      static: true,

      onClose: function (selectedDates) {
        const checkinInput = document.getElementById("nav-checkin-input");
        const checkoutInput = document.getElementById("nav-checkout-input");
        const errorMessageDiv = document.getElementById("date-error-message");

        errorMessageDiv.style.display = "none";
        errorMessageDiv.textContent = "";

        if (
          selectedDates.length === 2 &&
          selectedDates[0].getTime() === selectedDates[1].getTime()
        ) {
          errorMessageDiv.style.display = "block";
          errorMessageDiv.textContent =
            "Check-out date cannot be the same as check-in.";

          instance.clear();
          checkinInput.value = "";
          checkoutInput.value = "";
          return;
        }
        if (selectedDates.length === 2) {
          checkinInput.value = this.formatDate(selectedDates[0], "Y-m-d");
          checkoutInput.value = this.formatDate(selectedDates[1], "Y-m-d");
        }
      },
    });

    checkoutInput.addEventListener("click", () => fp.open());
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const filterModal = document.getElementById("filterModal");
  if (filterModal) {
    const priceSlider = document.getElementById("price-slider");
    const minPriceInput = document.getElementById("min-price");
    const maxPriceInput = document.getElementById("max-price");

    if (priceSlider) {
      noUiSlider.create(priceSlider, {
        start: [0, 10000],
        connect: true,
        range: {
          min: 0,
          max: 10000,
        },
        step: 100,
        format: {
          to: (value) => Math.round(value),
          from: (value) => Number(value),
        },
      });

      priceSlider.noUiSlider.on("update", function (values, handle) {
        if (handle === 0) {
          minPriceInput.value = values[handle];
        } else {
          maxPriceInput.value = values[handle];
        }
      });

      minPriceInput.addEventListener("change", function () {
        priceSlider.noUiSlider.set([this.value, null]);
      });
      maxPriceInput.addEventListener("change", function () {
        priceSlider.noUiSlider.set([null, this.value]);
      });
    }

    const steppers = document.querySelectorAll(".stepper-input");
    steppers.forEach((stepper) => {
      const minusBtn = stepper.querySelector(".minus");
      const plusBtn = stepper.querySelector(".plus");
      const valueSpan = stepper.querySelector(".stepper-value");
      const hiddenInput = document.querySelector(
        `input[name="${valueSpan.dataset.name}"]`
      );

      let count = 0;

      function updateValue() {
        if (count === 0) {
          valueSpan.textContent = "Any";
          hiddenInput.value = "";
        } else {
          valueSpan.textContent = count;
          hiddenInput.value = count;
        }
      }

      minusBtn.addEventListener("click", () => {
        if (count > 0) {
          count--;
          updateValue();
        }
      });

      plusBtn.addEventListener("click", () => {
        if (count < 10) {
          count++;
          updateValue();
        }
      });
    });

    const clearBtn = filterModal.querySelector(".btn-clear");
    const filterForm = document.getElementById("filter-form");

    clearBtn.addEventListener("click", () => {
      filterForm.reset();

      if (priceSlider) {
        priceSlider.noUiSlider.set([0, 50000]);
      }

      document.querySelectorAll(".stepper-value").forEach((span) => {
        span.textContent = "Any";
      });
      document
        .querySelectorAll(
          'input[name="bedrooms"], input[name="beds"], input[name="bathrooms"]'
        )
        .forEach((input) => {
          input.value = "";
        });
    });
  }
});
