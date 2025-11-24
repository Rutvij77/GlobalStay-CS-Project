document.addEventListener("DOMContentLoaded", function () {
  const isEditMode =
    typeof listingData !== "undefined" && listingData && listingData._id;

  const MAX_FILE_SIZE = 3 * 1024 * 1024;

  const predefinedAmenities = [
    "WiFi",
    "Air Conditioning",
    "Parking",
    "Pool",
    "Gym",
    "TV",
    "Kitchen",
    "Washing Machine",
    "Heating",
    "Workspace",
    "Hot Water",
    "Refrigerator",
    "Microwave",
    "Dishwasher",
    "Balcony",
    "Garden",
    "Fireplace",
    "BBQ Grill",
  ];
  let customAmenities = [];

  let newImages = [];
  let imagesToDelete = [];

  const form = document.getElementById("propertyForm");
  const submitButton = form.querySelector('button[type="submit"]');
  const requiredFields = form.querySelectorAll("[required]");

  // Builds the amenities checkbox list and restores custom ones if editing
  function initializeAmenities(existingAmenities = []) {
    const grid = document.getElementById("amenitiesGrid");
    if (!grid) return;
    grid.innerHTML = "";

    predefinedAmenities.forEach((amenity) => {
      const div = document.createElement("div");
      div.className = "amenity-item";
      const id = `amenity-${amenity.toLowerCase().replace(/\s+/g, "-")}`;
      const isChecked = existingAmenities.includes(amenity) ? "checked" : "";
      div.innerHTML = `
        <input type="checkbox" id="${id}" name="listing[amenities][]" value="${amenity}" ${isChecked}>
        <label for="${id}">${amenity}</label>
      `;
      grid.appendChild(div);
    });

    if (isEditMode) {
      existingAmenities.forEach((amenity) => {
        if (!predefinedAmenities.includes(amenity)) {
          customAmenities.push(amenity);
        }
      });
      updateCustomAmenitiesTags();
    }
  }

  // Makes sure a thumbnail image is selected (skip if editing)
  function validateThumbnail() {
    if (isEditMode) {
      clearError("thumbnailError");
      return true;
    }
    const thumbnailInput = document.getElementById("thumbnail");
    if (thumbnailInput.files.length !== 1) {
      showError("thumbnailError", "A thumbnail image is required.");
      return false;
    }
    clearError("thumbnailError");
    return true;
  }

  // Checks that total images are between 5 and 10
  function validateImages() {
    const existingCount = isEditMode
      ? document.querySelectorAll(".existing-preview-item").length
      : 0;
    const totalImages =
      existingCount - imagesToDelete.length + newImages.length;
    if (totalImages >= 5 && totalImages <= 10) {
      clearError("imagesCountError");
      return true;
    }
    showError(
      "imagesCountError",
      `You must have images between 5 and 10 images. You currently have ${totalImages}.`
    );
    return false;
  }

  // Enables or disables the submit button based on form validity
  function validateFormOnInput() {
    let isFormValid = true;

    requiredFields.forEach((field) => {
      if (!field.value.trim()) isFormValid = false;
    });

    const existingCount = isEditMode
      ? document.querySelectorAll(".existing-preview-item").length
      : 0;
    const totalImages =
      existingCount - imagesToDelete.length + newImages.length;

    if (totalImages < 5 || totalImages > 10) isFormValid = false;

    if (!isEditMode) {
      if (document.getElementById("thumbnail").files.length !== 1)
        isFormValid = false;
    }

    submitButton.disabled = !isFormValid;
  }

  // Form submit handling
  form.addEventListener("submit", function (event) {
    let isFormCompletelyValid = true;
    requiredFields.forEach((field) => {
      if (field.type === "file") return;
      if (!validateField(field)) {
        isFormCompletelyValid = false;
      }
    });

    if (!validateThumbnail()) isFormCompletelyValid = false;
    if (!validateImages()) isFormCompletelyValid = false;

    if (!isFormCompletelyValid) {
      event.preventDefault();
      const firstError = document.querySelector(".error-message:not(:empty)");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      prepareCustomAmenitiesForSubmission();
    }
  });

  // Field validation events
  requiredFields.forEach((field) => {
    if (field.type !== "file") {
      field.addEventListener("input", () => {
        clearError(field.id + "Error");
        validateFormOnInput();
      });
      field.addEventListener("blur", () => validateField(field));
    }
  });

  // Handles thumbnail upload and shows preview
  window.handleThumbnailUpload = function (event) {
    const file = event.target.files[0];

    if (!file) {
      removeThumbnail();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError(
        "thumbnailError",
        "File size exceeds the limit. Maximum allowed size is 3 MB."
      );
      event.target.value = "";
      setTimeout(() => {
        clearError("thumbnailError");
      }, 3000);
      return;
    }

    clearError("thumbnailError");
    displayThumbnailPreview(file);
    validateFormOnInput();
  };

  // Shows the selected thumbnail image in preview
  function displayThumbnailPreview(file) {
    const preview = document.getElementById("thumbnailPreview");
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<div class="preview-item"><img src="${e.target.result}" alt="Thumbnail"><button type="button" class="remove-image" onclick="removeThumbnail()">&times;</button></div>`;
    };
    reader.readAsDataURL(file);
  }

  // Removes the selected thumbnail preview
  window.removeThumbnail = function () {
    document.getElementById("thumbnail").value = "";
    document.getElementById("thumbnailPreview").innerHTML = "";
    validateFormOnInput();
  };

  // Handles new property images upload with size/count limits
  window.handleImagesUpload = function (event) {
    let selectedFiles = Array.from(event.target.files);

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        return false;
      }
      return true;
    });

    if (validFiles.length < selectedFiles.length) {
      showError(
        "imagesSizeError",
        "Some files could not be uploaded because they are larger than 3 MB."
      );

      setTimeout(() => {
        clearError("imagesSizeError");
      }, 3000);
    }

    if (newImages.length + validFiles.length > 10) {
      showError(
        "imagesCountError",
        "Maximum 10 images allowed. Your selection has been trimmed."
      );
      const remainingSlots = 10 - newImages.length;
      validFiles = validFiles.slice(0, remainingSlots);
    }

    validFiles.forEach((file) => {
      if (!newImages.some((f) => f.name === file.name)) {
        newImages.push(file);
      }
    });

    event.target.value = "";
    updateNewImageFileInput();
  };

  // Removes one of the newly uploaded images
  window.removeNewImage = function (index) {
    newImages.splice(index, 1);
    updateNewImageFileInput();
  };

  // Updates hidden file input with selected new images
  function updateNewImageFileInput() {
    const imagesInput = document.getElementById("images");
    const dataTransfer = new DataTransfer();
    newImages.forEach((file) => dataTransfer.items.add(file));
    imagesInput.files = dataTransfer.files;

    displayNewImagesPreview();
    updateImageCounterAndValidation();
  }

  // Shows previews for all new uploaded images
  function displayNewImagesPreview() {
    const preview = document.getElementById("newImagesPreview");
    if (!preview) return;
    preview.innerHTML = "";
    newImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement("div");
        div.className = "preview-item";
        div.innerHTML = `<img src="${e.target.result}" alt="New image"><button type="button" class="remove-image" onclick="removeNewImage(${index})">&times;</button>`;
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  // Updates total image counter and validates count
  function updateImageCounterAndValidation() {
    const imagesInput = document.getElementById("images");
    const uploadArea = imagesInput
      ?.closest(".mb-4")
      .querySelector(".image-upload-area");

    const existingCount = isEditMode
      ? document.querySelectorAll(".existing-preview-item").length
      : 0;
    const totalImages =
      existingCount - imagesToDelete.length + newImages.length;

    const counter = document.getElementById("imageCounter");
    if (counter) {
      counter.textContent = `Total images: ${totalImages} (5 to 10 allowed)`;
    }

    const isValid = totalImages >= 5 && totalImages <= 10;
    if (isValid) {
      if (counter) counter.style.color = "#28a745";
      clearError("imagesCountError");
    } else {
      if (counter) counter.style.color = "#dc3545";
      showError(
        "imagesCountError",
        `You must have images between 5 and 10 images. You currently have ${totalImages}.`
      );
    }

    if (totalImages >= 10) {
      if (imagesInput) imagesInput.disabled = true;
      if (uploadArea) uploadArea.classList.add("disabled");
    } else {
      if (imagesInput) imagesInput.disabled = false;
      if (uploadArea) uploadArea.classList.remove("disabled");
    }
    validateFormOnInput();
  }

  // Syncs all images into the file input
  function updateImageFileInput() {
    const imagesInput = document.getElementById("images");
    const dataTransfer = new DataTransfer();
    allPropertyImages.forEach((file) => {
      dataTransfer.items.add(file);
    });

    imagesInput.files = dataTransfer.files;

    displayImagesPreview(allPropertyImages);
    updateImageCounter();
    validateFormOnInput();
  }

  // Shows previews of existing images
  function displayImagesPreview(files) {
    const preview = document.getElementById("imagesPreview");
    preview.innerHTML = "";
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement("div");
        div.className = "preview-item";
        div.innerHTML = `<img src="${e.target.result}" alt="Property image"><button type="button" class="remove-image" onclick="removeImage(${index})">&times;</button>`;
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }

  // Removes an image from existing list
  window.removeImage = function (index) {
    const imagesInput = document.getElementById("images");
    const files = Array.from(imagesInput.files);
    files.splice(index, 1);
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    imagesInput.files = dataTransfer.files;
    displayImagesPreview(files);
    updateImageCounter();
    validateFormOnInput();
  };

  // Marks or unmarks an existing image for deletion
  window.handleDeleteExistingImage = function (event) {
    event.preventDefault();
    const button = event.currentTarget;
    const previewItem = button.closest(".existing-preview-item");
    const filename = previewItem.dataset.filename;

    if (imagesToDelete.includes(filename)) {
      imagesToDelete = imagesToDelete.filter((item) => item !== filename);
      previewItem.classList.remove("marked-for-deletion");
    } else {
      imagesToDelete.push(filename);
      previewItem.classList.add("marked-for-deletion");
    }

    updateDeleteImagesInput();
    updateImageCounterAndValidation();
  };

  // Updates hidden inputs for images marked for deletion
  function updateDeleteImagesInput() {
    const container = document.getElementById("deleteImagesContainer");
    if (!container) return;
    container.innerHTML = "";
    imagesToDelete.forEach((filename) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "deleteImages[]";
      input.value = filename;
      container.appendChild(input);
    });
  }

  // Updates image counter text (color + count)
  function updateImageCounter() {
    const counter = document.getElementById("imageCounter");
    const count = allPropertyImages.length;
    counter.textContent = `${count} image${
      count !== 1 ? "s" : ""
    } selected (5 to 10 required)`;
    counter.style.color = count >= 5 && count <= 10 ? "#28a745" : "#dc3545";
  }

  // Displays an error message in the given element
  function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) errorElement.textContent = message;
  }

  // Clears error message for the given element
  function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) errorElement.textContent = "";
  }

  // Validates a single input field based on rules
  function validateField(field) {
    const errorId = field.id + "Error";
    if (field.hasAttribute("required") && !field.value.trim()) {
      showError(errorId, "This field is required.");
      return false;
    }
    if (field.type === "number") {
      const min = parseFloat(field.min);
      if (!isNaN(min) && parseFloat(field.value) < min) {
        showError(errorId, `Value must be at least ${min}.`);
        return false;
      }
    }
    clearError(errorId);
    return true;
  }

  // Prepares hidden inputs for custom amenities before submit
  function prepareCustomAmenitiesForSubmission() {
    form
      .querySelectorAll('input[name="listing[amenities][]"][data-custom]')
      .forEach((el) => el.remove());
    customAmenities.forEach((amenity) => {
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.name = "listing[amenities][]";
      hiddenInput.value = amenity;
      hiddenInput.dataset.custom = "true";
      form.appendChild(hiddenInput);
    });
  }

  // Adds a new custom amenity tag
  window.addCustomAmenity = function () {
    const input = document.getElementById("customAmenity");
    const amenity = input.value.trim();
    if (
      amenity &&
      !customAmenities.includes(amenity) &&
      !predefinedAmenities.includes(amenity)
    ) {
      customAmenities.push(amenity);
      updateCustomAmenitiesTags();
      input.value = "";
    }
  };

  // Removes a custom amenity tag
  window.removeCustomAmenity = function (amenity) {
    const index = customAmenities.indexOf(amenity);
    if (index > -1) {
      customAmenities.splice(index, 1);
      updateCustomAmenitiesTags();
    }
  };

  // Refreshes the display of custom amenities tags
  function updateCustomAmenitiesTags() {
    const container = document.getElementById("customAmenitiesTags");
    container.innerHTML = customAmenities
      .map(
        (amenity) =>
          `<span class="custom-amenity-tag">${amenity}<span class="remove-tag" onclick="removeCustomAmenity('${amenity}')">&times;</span></span>`
      )
      .join("");
  }

  // Double-checks all validation before submit
  form.addEventListener("submit", function (event) {
    let isFormCompletelyValid = true;
    requiredFields.forEach((field) => {
      if (field.type !== "file" && !validateField(field)) {
        isFormCompletelyValid = false;
      }
    });

    if (!validateThumbnail()) isFormCompletelyValid = false;
    if (!validateImages()) isFormCompletelyValid = false;

    if (!isFormCompletelyValid) {
      event.preventDefault();
      document
        .querySelector(".error-message:not(:empty)")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      prepareCustomAmenitiesForSubmission();
    }
  });

  document
    .getElementById("thumbnail")
    .addEventListener("change", handleThumbnailUpload);
  document
    .getElementById("images")
    .addEventListener("change", handleImagesUpload);
  document
    .getElementById("addAmenityBtn")
    .addEventListener("click", addCustomAmenity);
  document.getElementById("customAmenity").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomAmenity();
    }
  });
  requiredFields.forEach((field) => {
    if (field.type !== "file") {
      field.addEventListener("input", () => {
        clearError(field.id + "Error");
        validateFormOnInput();
      });
      field.addEventListener("blur", () => validateField(field));
    }
  });

  // Initializes form differently for edit mode vs create mode
  function main() {
    if (isEditMode) {
      initializeAmenities(listingData.amenities);
      updateImageCounterAndValidation();
      submitButton.disabled = false;
    } else {
      initializeAmenities();
      validateFormOnInput();
    }
  }

  main();
});
