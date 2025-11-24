const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const {
  isLoggedIn,
  isListing,
  validateBooking,
  checkNotOwner,
  checkValidDates,
  checkGuestCount,
  checkAvailability,
  recalcTotalPrice,
  canCancelBooking,
  fetchListingAndBooking,
  checkBookingRules,
  isOwner,
} = require("../middleware.js");
const bookingController = require("../controllers/bookingController.js");

//Create a booking
router
  .route("/")
  .get(isLoggedIn, isListing, wrapAsync(bookingController.Bookings)) // Get all bookings for owner
  .post(
    isLoggedIn,
    isListing,
    validateBooking,
    checkNotOwner,
    checkValidDates,
    checkGuestCount,
    checkAvailability,
    recalcTotalPrice,
    wrapAsync(bookingController.addBooking) // create Booking
  );

//Display all Bookings for user
router.get("/myBookings", isLoggedIn, wrapAsync(bookingController.allBooking));

//Cancel a Booking
router.delete(
  "/:bookingId/cancel",
  isLoggedIn,
  canCancelBooking,
  wrapAsync(bookingController.cancelBooking)
);

//Update a Booking
router.put(
  "/:bookingId/update",
  isLoggedIn,
  fetchListingAndBooking,
  validateBooking,
  checkBookingRules,
  wrapAsync(bookingController.updateBooking)
);

module.exports = router;
