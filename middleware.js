const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const Booking = require("./models/booking.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema, bookingSchema } = require("./schema.js");
const axios = require("axios");

// Middleware to expose current user and host status (has listings or not)
// to all views via res.locals
module.exports.setUserLocals = async (req, res, next) => {
  res.locals.currUser = req.user;

  if (req.user) {
    const userListings = await Listing.find({ owner: req.user._id }).limit(1);
    res.locals.hasListings = userListings.length > 0;
  } else {
    res.locals.hasListings = false;
  }

  next();
};

// Validate listing data with Joi schema
module.exports.validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// Validate listing address using OpenStreetMap API
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
      req.flash(
        "error",
        "Address not found. Please check your address and try again."
      );

      const filesToDelete = [];
      if (req.files["listing[thumbnail]"]) {
        filesToDelete.push(req.files["listing[thumbnail]"][0].filename);
      }
      if (req.files["listing[images]"]) {
        req.files["listing[images]"].forEach((file) =>
          filesToDelete.push(file.filename)
        );
      }

      if (filesToDelete.length > 0) {
        await cloudinary.api.delete_resources(filesToDelete);
      }

      return res.redirect("/listings/new");
    }
  } catch (err) {
    const filesToDelete = [];
    if (req.files["listing[thumbnail]"]) {
      filesToDelete.push(req.files["listing[thumbnail]"][0].filename);
    }
    if (req.files["listing[images]"]) {
      req.files["listing[images]"].forEach((file) =>
        filesToDelete.push(file.filename)
      );
    }

    if (filesToDelete.length > 0) {
      await cloudinary.api.delete_resources(filesToDelete);
    }
    req.flash("error", "There was an error verifying the address.");
    return res.redirect("/listings/new");
  }
};

// Check if user is logged in
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.user) {
    req.session.redirectUrl = req.originalUrl;
    return res.redirect("/login"); // This triggers App ID login
  }
  next();
};

// Check if listing exists and make it available in res.locals
module.exports.isListing = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings/myListings");
  }

  res.locals.listing = listing;
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
  let listing = await Listing.findById(id);
  if (!listing.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the owner of this listings.");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// Check if user has hosted any listings
module.exports.isHoster = async (req, res, next) => {
  const hasListings = await Listing.exists({ owner: req.user._id });

  if (!hasListings) {
    req.flash("error", "You have not hosted any listings yet.");
    return res.redirect("/listings/myListings");
  }

  next();
};

// Validate review data with Joi schema
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
  let review = await Review.findById(reviewId);
  if (!review.author.equals(res.locals.currUser._id)) {
    req.flash("error", "You did not created this review.");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// Validate booking data with Joi schema
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
  let listing = await Listing.findById(id);
  if (listing.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "You cannot book your own listing.");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// Check if booking dates are valid
module.exports.checkValidDates = async (req, res, next) => {
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

    // Check-in must not be in the past
    if (inDate < today) {
      req.flash("error", "Check-in date cannot be in the past.");
      return res.redirect(`/listings/${id}`);
    }

    // Check-in and check-out cannot be the same day
    if (outDate.getTime() === inDate.getTime()) {
      req.flash("error", "Check-in and check-out cannot be on the same day.");
      return res.redirect(`/listings/${id}`);
    }

    // Check-out must be after check-in
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
  let listing = await Listing.findById(id);
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

  const checkIn = new Date(req.body.booking.checkIn);
  const checkOut = new Date(req.body.booking.checkOut);

  const conflict = await Booking.findOne({
    listing: id,
    status: "confirmed",
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });

  if (conflict) {
    req.flash("error", "Selected dates are not available.");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Recalculate and validate total booking price
module.exports.recalcTotalPrice = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  const submittedPrice = Number(req.body.booking.totalAmount);
  const totalDays =
    (new Date(req.body.booking.checkOut) - new Date(req.body.booking.checkIn)) /
    (1000 * 60 * 60 * 24);
  const expectedPrice = listing.price * totalDays;
  if (submittedPrice !== expectedPrice) {
    req.flash("error", "Price mismatch. Please try again.");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

// Check if booking can be canceled
module.exports.canCancelBooking = async (req, res, next) => {
  const { id, bookingId } = req.params;
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    req.flash("error", "The requested booking does not exist!");
    return res.redirect(`/listings/${id}/booking/myBookings`);
  }

  if (!booking.user.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not authorized to manage this booking!");
    return res.redirect(`/listings/${id}/booking/myBookings`);
  }

  if (booking.status === "canceled") {
    req.flash("error", "This booking has already been canceled!");
    return res.redirect(`/listings/${id}/booking/myBookings`);
  }

  if (booking.checkIn <= new Date()) {
    req.flash("error", "You cannot cancel a booking that has already started!");
    return res.redirect(`/listings/${id}/booking/myBookings`);
  }

  req.booking = booking;
  req.id = id;
  next();
};

// Fetch both listing and booking, attach to request
module.exports.fetchListingAndBooking = async (req, res, next) => {
  try {
    const { id, bookingId } = req.params;

    const booking = await Booking.findById(bookingId).populate("listing");
    if (!booking) {
      req.flash("error", "Booking not found");
      return res.redirect(`/listings/${id}/bookings/myBookings`);
    }

    const listing = booking.listing;
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect(`/listings/${id}/bookings/myBookings`);
    }

    req.booking = booking;
    req.listing = listing;

    next();
  } catch (err) {
    next(err);
  }
};

// Run all booking rules (owner check, dates, guests, price, availability)
module.exports.checkBookingRules = async (req, res, next) => {
  try {
    const { booking, listing } = req;
    const userId = res.locals.currUser._id;
    const { checkIn, checkOut, guests, totalAmount } = req.body.booking;

    // Prevent owner from booking their own listing
    if (listing.owner.equals(userId)) {
      req.flash("error", "You cannot book your own listing.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    if (!checkIn || !checkOut) {
      req.flash("error", "Both check-in and check-out dates are required.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }
    if (inDate < today) {
      req.flash("error", "Check-in date cannot be in the past.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }
    if (outDate <= inDate) {
      req.flash("error", "Check-out date must be after check-in date.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // Validate guest count
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

    // Check availability
    const conflict = await Booking.findOne({
      listing: listing._id,
      status: "confirmed",
      _id: { $ne: booking._id },
      checkIn: { $lt: outDate },
      checkOut: { $gt: inDate },
    });

    if (conflict) {
      req.flash("error", "Selected dates are not available.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // Recalculate total price
    const totalDays = (outDate - inDate) / (1000 * 60 * 60 * 24);
    const expectedPrice = listing.price * totalDays;
    if (Number(totalAmount) !== expectedPrice) {
      req.flash("error", "Price mismatch. Please try again.");
      return res.redirect(`/listings/${listing._id}/bookings/myBookings`);
    }

    // Attach calculated values in case controller needs them
    req.calculatedTotal = expectedPrice;
    req.checkIn = inDate;
    req.checkOut = outDate;
    req.guests = numGuests;

    next();
  } catch (err) {
    next(err);
  }
};
