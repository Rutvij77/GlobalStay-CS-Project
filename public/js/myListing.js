// Show either the active or inactive table, highlight the right button, and close dropdowns
function showTable(tableType) {
  document.getElementById("active-table").classList.add("hidden");
  document.getElementById("inactive-table").classList.add("hidden");

  const buttons = document.querySelectorAll(".toggle-btn");
  buttons.forEach((btn) => btn.classList.remove("active"));

  document.getElementById(`${tableType}-table`).classList.remove("hidden");

  const targetBtn = document.querySelector(
    `.toggle-btn[data-type="${tableType}"]`
  );
  if (targetBtn) targetBtn.classList.add("active");

  closeAllDropdowns();
}

// Open or close a dropdown menu near a button (repositions it if needed)
function toggleDropdown(button) {
  const existingMenu = document.querySelector(".dropdown-menu.show");

  if (existingMenu) {
    existingMenu.remove();
    if (existingMenu.dataset.ownerId === button.id) {
      return;
    }
  }

  if (!button.id) {
    button.id = `dd-toggle-${Math.random().toString(36).substr(2, 9)}`;
  }

  const originalMenu = button.nextElementSibling;

  const newMenu = originalMenu.cloneNode(true);
  newMenu.classList.add("show");
  newMenu.dataset.ownerId = button.id;

  document.body.appendChild(newMenu);

  const buttonRect = button.getBoundingClientRect();
  const menuRect = newMenu.getBoundingClientRect();

  const leftPosition = buttonRect.right - menuRect.width;
  newMenu.style.left = `${leftPosition}px`;

  const spaceBelow = window.innerHeight - buttonRect.bottom;
  const spaceAbove = buttonRect.top;

  if (spaceBelow < menuRect.height && spaceAbove > menuRect.height) {
    const topPosition = buttonRect.top - menuRect.height - 8;
    newMenu.style.top = `${topPosition}px`;
  } else {
    const topPosition = buttonRect.bottom + 8;
    newMenu.style.top = `${topPosition}px`;
  }
}

// Close all open dropdown menus
function closeAllDropdowns() {
  document.querySelectorAll(".dropdown-menu.show").forEach((menu) => {
    menu.classList.remove("show");
    menu.classList.remove("dropup");
    const tableContainer = menu.closest(".table-container");
    if (tableContainer) {
      tableContainer.style.overflowX = "auto";
    }
  });
}

// Placeholder: simulate opening a form to update a listing
function updateListing() {
  closeAllDropdowns();
}

// Change a listing’s status (active/inactive) by sending it to the server
function toggleStatus(button, newStatus) {
  fetch(`/listings/${listingId}/updateStatus`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: newStatus }),
  }).catch((error) => {
    console.error("Server update failed:", error);
  });
}

// Show a modal (confirmation popup) and prevent page scroll
function showModal(modalId) {
  let modalElement;
  if (modalId === "confirmation-modal") {
    modalElement = confirmationModal;
  }

  if (modalElement) {
    document.body.appendChild(modalElement);
    setTimeout(() => {
      modalElement.classList.add("show");
    }, 10);
    document.body.style.overflow = "hidden";
  }
}

// Close a modal and restore page scroll
function closeModal(modalId) {
  let modalElement;
  if (modalId === "confirmation-modal") {
    modalElement = confirmationModal;
  }

  if (modalElement) {
    modalElement.classList.remove("show");
    setTimeout(() => {
      if (modalElement.parentElement === document.body) {
        document.body.removeChild(modalElement);
      }
    }, 300);
    document.body.style.overflow = "";
  }
}

const confirmationModal = document.getElementById("confirmation-modal");

const modalTitle = confirmationModal.querySelector("#modal-title");
const modalText = confirmationModal.querySelector("#modal-text");
const modalListingImg = confirmationModal.querySelector("#modal-listing-img");
const modalListingTitle = confirmationModal.querySelector(
  "#modal-listing-title"
);
const modalConfirmForm = confirmationModal.querySelector("#modal-confirm-form");
const modalConfirmBtn = confirmationModal.querySelector("#modal-confirm-btn");
const modalCancelBtn = confirmationModal.querySelector("#modal-cancel-btn");

// Open confirmation modal for activating/deactivating a listing
function openConfirmationModal(listingId, newStatus) {
  const listing = listingsData[listingId];
  if (!listing) {
    console.error("Listing data not found for ID:", listingId);
    return;
  }

  modalListingImg.src = listing.thumbnail.url;
  modalListingTitle.textContent = listing.title;
  modalConfirmForm.action = `/listings/${listingId}/updateStatus?_method=PUT`;

  if (newStatus === "inactive") {
    modalTitle.textContent = "Deactivate Listing?";
    modalText.textContent =
      "Are you sure? This listing will be hidden from public view.";
    modalConfirmBtn.textContent = "Yes, Deactivate";
    modalConfirmBtn.className = "btn btn-danger";
  } else {
    modalTitle.textContent = "Activate Listing?";
    modalText.textContent =
      "This will make the listing publicly visible again.";
    modalConfirmBtn.textContent = "Yes, Activate";
    modalConfirmBtn.className = "btn btn-success";
  }

  showModal("confirmation-modal");
}

// Open confirmation modal for deleting a listing
function openDeleteConfirmationModal(listingId) {
  const listing = listingsData[listingId];
  if (!listing) {
    console.error("Listing data not found for ID:", listingId);
    return;
  }

  modalListingImg.src = listing.thumbnail.url;
  modalListingTitle.textContent = listing.title;

  modalConfirmForm.action = `/listings/${listingId}?_method=DELETE`;

  modalTitle.textContent = "Delete Listing?";
  modalText.textContent =
    "Are you sure you want to permanently delete this listing? This action cannot be undone.";
  modalConfirmBtn.textContent = "Yes, Delete";
  modalConfirmBtn.className = "btn btn-danger";

  showModal("confirmation-modal");
}

// When cancel button is clicked, close the modal
modalCancelBtn.addEventListener("click", () => {
  closeModal("confirmation-modal");
});

// Close dropdown menus when clicking outside of action buttons
document.addEventListener("click", function (e) {
  const openMenu = document.querySelector(".dropdown-menu.show");
  if (openMenu && !e.target.closest(".btn-icon")) {
    openMenu.remove();
  }
});

// Navigate to listing details when clicking a row (but not its actions)
document.addEventListener("click", function (e) {
  const row = e.target.closest(".listing-row");
  if (row && !e.target.closest(".actions")) {
    const listingId = row.dataset.listingId;
    if (listingId) {
      window.location.href = `/listings/${listingId}`;
    }
  }
});

// Allow closing dropdowns with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeAllDropdowns();
  }
});
