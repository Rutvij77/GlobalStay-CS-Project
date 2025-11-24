const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const listingController = require("../controllers/listingController.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 11,
  },
});
const {
  isLoggedIn,
  isListing,
  isOwner,
  validateListing,
  isHoster,
  validateAddress,
} = require("../middleware.js");

// All Listings & Create
router
  .route("/")
  .get(wrapAsync(listingController.getAllListings)) // Get all listings
  .post(
    isLoggedIn,
    upload.fields([
      { name: "listing[thumbnail]", maxCount: 1 },
      { name: "listing[images]", maxCount: 10 },
    ]),
    validateAddress,
    validateListing,
    wrapAsync(listingController.createListing) // Create Listing
  );

// New Listing Form
router.get("/new", isLoggedIn, listingController.renderCreateForm);

//Search Route
router.get("/search", wrapAsync(listingController.searchListing));

//My Listings Route
router.get(
  "/myListings",
  isLoggedIn,
  isHoster,
  wrapAsync(listingController.showUserListings)
);

// Single Listing (Show, Update, Delete)
router
  .route("/:id")
  .get(wrapAsync(listingController.getListingById)) // Show listing
  .put(
    isLoggedIn,
    isOwner,
    upload.fields([
      { name: "listing[thumbnail]", maxCount: 1 },
      { name: "listing[images]", maxCount: 10 },
    ]),
    validateListing,
    wrapAsync(listingController.updateListing) // Update listing
  )
  .delete(
    isLoggedIn,
    isOwner,
    isListing,
    wrapAsync(listingController.destroyListing) // Delete listing
  );

//Render Edit Route
router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(listingController.renderEditForm)
);

// Updating Listing Status (Available, Unavailable)
router.put(
  "/:id/updateStatus",
  isLoggedIn,
  isListing,
  isOwner,
  listingController.updateStatus
);

//Booking Data API
router.get(
  "/:id/booked-dates/:bookingId",
  wrapAsync(listingController.getBookedDates)
);

module.exports = router;
