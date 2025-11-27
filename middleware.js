const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema, bookingSchema } = require("./schema.js");
const axios = require("axios");
const { cloudinary } = require("./cloudConfig"); // Ensure this is imported for file deletion

// Middleware to expose current user and host status
module.exports.setUserLocals = async (req, res, next) => {
  res.locals.currUser = req.user;

  if (req.user) {
    // Cloudant: find returns an array of objects. We check if any exist.
    // Note: We use the generic find, but we could optimize this later with an index.
    const userListings = await Listing.find({ owner: req.user._id });
    res.locals.hasListings = userListings.length > 0;
  } else {
    res.locals.hasListings = false;
  }

  next();
};

// Validate listing data with Joi schema (Logic remains same)
module.exports.validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// Validate listing address using OpenStreetMap API (Logic remains same)
module.exports.validateAddress = async (req, res, next) => {
  try {
    const { street, city, state, code, country } = req.body.listing.address;
    let addressString = `${street}, ${city}, ${state}, ${code} ${country}`;
    let nominatimURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      addressString
    )}`;

    let response = await axios.get(nominatimURL, {
      headers: { "User-Agent": `globalstay/1.0 (${process.env.EMAIL})` },
    });

    if (!response.data || response.data.length === 0) {
      // Fallback: Try without street
      addressString = `${city}, ${state}, ${code} ${country}`;
      nominatimURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        addressString
      )}`;
      response = await axios.get(nominatimURL, {
        headers: { "User-Agent": `globalstay/1.0 (${process.env.EMAIL})` },
      });
    }

    if (response.data && response.data.length > 0) {
      const locationData = response.data[0];
      res.locals.location = {
        type: "Point",
        coordinates: [
          parseFloat(locationData.lon),
          parseFloat(locationData.lat),
        ],
      };
      return next();
    } else {
      // ... (Error handling and file deletion logic preserved) ...
      req.flash(
        "error",
        "Address not found. Please check your address and try again."
      );
      // Clean up uploaded files
      const filesToDelete = [];
      if (req.files["listing[thumbnail]"])
        filesToDelete.push(req.files["listing[thumbnail]"][0].filename);
      if (req.files["listing[images]"])
        req.files["listing[images]"].forEach((f) =>
          filesToDelete.push(f.filename)
        );
      if (filesToDelete.length > 0)
        await cloudinary.api.delete_resources(filesToDelete);
      return res.redirect("/listings/new");
    }
  } catch (err) {
    console.error(err);
    req.flash("error", "There was an error verifying the address.");
    return res.redirect("/listings/new");
  }
};

// Check if user is logged in
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.user) {
    req.session.redirectUrl = req.originalUrl;
    return res.redirect("/login");
  }
  next();
};

// Check if listing exists
module.exports.isListing = async (req, res, next) => {
  const { id } = req.params;
  const listingObj = await Listing.findById(id);
  if (!listingObj) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings/myListings");
  }
  // Cloudant: Store the raw data in locals
  res.locals.listing = listingObj.data;
  next();
};

// Save redirect URL for login
module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// Check if current user is the listing owner
module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  // Use existing local if available (from isListing) or fetch
  let listing = res.locals.listing;
  if (!listing) {
    const obj = await Listing.findById(id);
    listing = obj ? obj.data : null;
  }

  // Cloudant Change: String comparison (===), not .equals()
  if (!listing || listing.owner !== res.locals.currUser._id) {
    req.flash("error", "You are not the owner of this listing.");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// Check if user has hosted any listings
module.exports.isHoster = async (req, res, next) => {
  // Cloudant: Check if any documents exist for this owner
  const userListings = await Listing.find({ owner: req.user._id });

  if (userListings.length === 0) {
    req.flash("error", "You have not hosted any listings yet.");
    return res.redirect("/listings/myListings");
  }

  next();
};

// Validate review data
module.exports.validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// Check if current user is the author of the review
module.exports.isReviewAuthor = async (req, res, next) => {
  let { id, reviewId } = req.params;
  let reviewObj = await Review.findById(reviewId);

  // Cloudant Change: Unwrap data and compare strings
  if (!reviewObj || reviewObj.data.author !== res.locals.currUser._id) {
    req.flash("error", "You did not create this review.");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// Validate booking data
module.exports.validateBooking = (req, res, next) => {
  let { error } = bookingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// Prevent user from booking their own listing
module.exports.checkNotOwner = async (req, res, next) => {
  let { id } = req.params;
  let listingObj = await Listing.findById(id);

  // Cloudant Change: Unwrap data and compare strings
  if (listingObj.data.owner === res.locals.currUser._id) {
    req.flash("error", "You cannot book your own listing.");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// Check if booking dates are valid (Logic remains same)
module.exports.checkValidDates = async (req, res, next) => {
  let { id } = req.params; // Needed for redirect
  try {
    const { checkIn, checkOut } = req.body.booking;

    if (!checkIn || !checkOut) {
      req.flash("error", "Both check-in and check-out dates are required.");
      return res.redirect(`/listings/${id}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    if (inDate < today) {
      req.flash("error", "Check-in date cannot be in the past.");
      return res.redirect(`/listings/${id}`);
    }
    if (outDate.getTime() === inDate.getTime()) {
      req.flash("error", "Check-in and check-out cannot be on the same day.");
      return res.redirect(`/listings/${id}`);
    }
    if (outDate <= inDate) {
      req.flash("error", "Check-out date must be after check-in date.");
      return res.redirect(`/listings/${id}`);
    }
    next();
  } catch (err) {
    console.error("Date validation error:", err);
    req.flash("error", "Invalid dates provided.");
    return res.redirect(`/listings/${id}`);
  }
};

// Check if guest count is within allowed range
module.exports.checkGuestCount = async (req, res, next) => {
  let { id } = req.params;
  let listingObj = await Listing.findById(id);
  const listing = listingObj.data; // Unwrap

  const guests = parseInt(req.body.booking.guests, 10);
  if (isNaN(guests) || guests < 1 || guests > listing.details.guests) {
    req.flash(
      "error",
      `Guests must be between 1 and ${listing.details.guests}.`
    );
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// Check if listing is available for selected dates
module.exports.checkAvailability = async (req, res, next) => {
  let { id } = req.params;

  const checkIn = new Date(req.body.booking.checkIn).toISOString();
  const checkOut = new Date(req.body.booking.checkOut).toISOString();

  // Cloudant Selector logic replacement for MongoDB Query
  const conflicts = await Booking.find({
    listing: id,
    status: "confirmed",
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });

  if (conflicts.length > 0) {
    req.flash("error", "Selected dates are not available.");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Recalculate and validate total booking price
module.exports.recalcTotalPrice = async (req, res, next) => {
  let { id } = req.params;
  let listingObj = await Listing.findById(id);
  const listing = listingObj.data; // Unwrap

  const submittedPrice = Number(req.body.booking.totalAmount);
  const totalDays =
    (new Date(req.body.booking.checkOut) - new Date(req.body.booking.checkIn)) /
    (1000 * 60 * 60 * 24);

  const expectedPrice = listing.price * totalDays;

  // Use a small epsilon for float comparison if needed, but exact match usually fine for integers
  if (submittedPrice !== expectedPrice) {
    req.flash("error", "Price mismatch. Please try again.");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Check if booking can be canceled
module.exports.canCancelBooking = async (req, res, next) => {
  const { id, bookingId } = req.params;
  const bookingObj = await Booking.findById(bookingId);

  if (!bookingObj) {
    req.flash("error", "The requested booking does not exist!");
    return res.redirect(`/listings/${id}/bookings/myBookings`);
  }

  const booking = bookingObj.data; // Unwrap

  // Cloudant comparison
  if (booking.user !== res.locals.currUser._id) {
    req.flash("error", "You are not authorized to manage this booking!");
    return res.redirect(`/listings/${id}/bookings/myBookings`);
  }

  if (booking.status === "canceled") {
    req.flash("error", "This booking has already been canceled!");
    return res.redirect(`/listings/${id}/bookings/myBookings`);
  }

  if (new Date(booking.checkIn) <= new Date()) {
    req.flash("error", "You cannot cancel a booking that has already started!");
    return res.redirect(`/listings/${id}/bookings/myBookings`);
  }

  req.booking = bookingObj; // Pass the class instance (for methods like .save or .delete)
  req.id = id;
  next();
};

// Fetch both listing and booking
// REPLACES POPULATE() WITH MANUAL FETCH
module.exports.fetchListingAndBooking = async (req, res, next) => {
  try {
    const { id, bookingId } = req.params;

    const bookingObj = await Booking.findById(bookingId);
    if (!bookingObj) {
      req.flash("error", "Booking not found");
      return res.redirect(`/listings/${id}/bookings/myBookings`);
    }

    // Manual Populate: Fetch Listing using the ID stored in booking
    const listingObj = await Listing.findById(bookingObj.data.listing);
    if (!listingObj) {
      req.flash("error", "Listing not found");
      return res.redirect(`/listings/${id}/bookings/myBookings`);
    }

    req.booking = bookingObj.data;
    req.listing = listingObj.data;

    next();
  } catch (err) {
    next(err);
  }
};

// Run all booking rules
module.exports.checkBookingRules = async (req, res, next) => {
  try {
    const { booking, listing } = req;
    const userId = res.locals.currUser._id;
    const { checkIn, checkOut, guests, totalAmount } = req.body.booking;

    // 1. Owner Check (String comparison)
    if (listing.owner === userId) {
      req.flash("error", "You cannot book your own listing.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // 2. Date Validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    if (!checkIn || !checkOut) {
      req.flash("error", "Dates required.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }
    if (inDate < today) {
      req.flash("error", "Check-in cannot be in the past.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }
    if (outDate <= inDate) {
      req.flash("error", "Check-out must be after check-in.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // 3. Guest Count
    const numGuests = parseInt(guests, 10);
    if (
      isNaN(numGuests) ||
      numGuests < 1 ||
      numGuests > listing.details.guests
    ) {
      req.flash(
        "error",
        `Guests must be between 1 and ${listing.details.guests}.`
      );
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // 4. Availability Check (Excluding current booking)
    const conflicts = await Booking.find({
      listing: listing._id,
      status: "confirmed",
      _id: { $ne: booking._id }, // Exclude current booking
      checkIn: { $lt: outDate.toISOString() },
      checkOut: { $gt: inDate.toISOString() },
    });

    if (conflicts.length > 0) {
      req.flash("error", "Selected dates are not available.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // 5. Price Check
    const totalDays = (outDate - inDate) / (1000 * 60 * 60 * 24);
    const expectedPrice = listing.price * totalDays;
    if (Number(totalAmount) !== expectedPrice) {
      req.flash("error", "Price mismatch. Please try again.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // Pass calculated values
    req.calculatedTotal = expectedPrice;
    req.checkIn = inDate;
    req.checkOut = outDate;
    req.guests = numGuests;
    req.booking = booking;

    next();
  } catch (err) {
    next(err);
  }
};
