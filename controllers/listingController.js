const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const User = require("../models/user.js");
const Booking = require("../models/booking");
const { cloudinary } = require("../cloudConfig");
const axios = require("axios");

// Show all available listings
module.exports.getAllListings = async (req, res) => {
  const listingObjs = await Listing.find({ status: "available" });

  // 2. Unwrap the data so EJS can read it directly
  const allListings = listingObjs.map((obj) => obj.data);

  return res.render("listings/index.ejs", {
    allListings,
    pageStyles: ["/css/index.css"],
  });
};

// Render the form for creating a new listing
module.exports.renderCreateForm = (req, res) => {
  return res.render("listings/new.ejs", {
    pageStyles: ["/css/newForm.css"],
    pageScripts: ["/js/newForm.js"],
  });
};

// Create a new listing, handle image uploads, and save to DB
module.exports.createListing = async (req, res, next) => {
  try {
    // console.log("--> 1. Inside Create Listing Controller");

    const listingData = req.body.listing;

    if (res.locals.location) {
      listingData.location = res.locals.location;
    } else {
      // Default Dummy Location (So Cloudant doesn't complain)
      listingData.location = { type: "Point", coordinates: [0, 0] };
    }

    // console.log("--> 2. Saving to Cloudant...");

    if (req.files && req.files["listing[thumbnail]"]) {
      const file = req.files["listing[thumbnail]"][0];
      listingData.thumbnail = { url: file.path, filename: file.filename };
    }

    // Handle images
    if (req.files && req.files["listing[images]"]) {
      listingData.images = req.files["listing[images]"].map((file) => ({
        url: file.path,
        filename: file.filename,
      }));
    }

    const newListing = new Listing(listingData);
    newListing.data.owner = req.user._id;
    await newListing.save();

    req.flash("success", "Your listing has been successfully created!");
    res.redirect(`/listings/${newListing.data._id}`);
  } catch (err) {
    next(err);
  }
};

// Show details of a single listing, including reviews, owner, and booked dates
module.exports.getListingById = async (req, res) => {
  let { id } = req.params;
  const { checkin, checkout, guests, totalDays } = req.query;

  try {
    // 1. Fetch Listing
    let listingObj = await Listing.findById(id);
    if (!listingObj) {
      req.flash("error", "The listing you are looking for does not exist.");
      return res.redirect("/listings");
    }
    const listing = listingObj.data; // Work with raw data

    let ownerUsername = "Unknown Host";
    let hostYears = 0;

    // 2. Manual Populate: Owner
    // We use findOne with the selector for _id
    // Note: User.findOne returns a User instance, we want the data
    if (listing.owner) {
      // Use findById, not findOne
      const ownerObj = await User.findById(listing.owner);
      if (ownerObj) {
        ownerUsername = ownerObj.data.username;
        // Calculate Host Years
        const createdAt = new Date(ownerObj.data.createdAt || Date.now());
        hostYears = new Date().getFullYear() - createdAt.getFullYear();
      }
    }

    // 3. Manual Populate: Reviews + Review Authors
    listing.populatedReviews = []; // Create a new array to hold full objects
    if (listing.reviews && listing.reviews.length > 0) {
      for (let reviewId of listing.reviews) {
        let reviewObj = await Review.findById(reviewId);
        if (reviewObj) {
          let reviewData = reviewObj.data;
          // Fetch Author for this review
          let authorUsername = "Unknown";
          if (reviewData.author) {
            let authorObj = await User.findById(reviewData.author);
            if (authorObj) authorUsername = authorObj.data.username;
          }

          // Attach the username securely without removing the author ID
          reviewData.authorUsername = authorUsername;

          listing.populatedReviews.push(reviewData);
        }
      }
    }
    // Swap the ID array for the populated array for the EJS template
    listing.reviews = listing.populatedReviews;

    // 4. Fetch Bookings
    const bookings = await Booking.find({ listing: id, status: "confirmed" });
    const bookedDates = bookings.map((b) => ({
      start: b.data.checkIn,
      end: b.data.checkOut,
    }));

    const createdAt = new Date(listing.owner.createdAt);
    const years = new Date().getFullYear() - createdAt.getFullYear();

    return res.render("listings/show.ejs", {
      listing,
      bookedDates,
      ownerUsername,
      hostYears,
      checkin: checkin || "",
      checkout: checkout || "",
      guests: guests || 1,
      totalDays: totalDays || 1,
      pageStyles: ["/css/show.css"],
      pageScripts: ["/js/show.js"],
    });
  } catch (err) {
    console.error("Error in getListingById", err);
    req.flash("error", "Error loading listing details");
    res.redirect("/listings");
  }
};

// To generate smaller version from cloudinary
function getOptimizedUrl(url) {
  return url.includes("/upload/")
    ? url.replace("/upload/", "/upload/w_250/")
    : url;
}

// Render the edit form for an existing listing, with optimized image previews
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listingObj = await Listing.findById(id);

  if (!listingObj) {
    req.flash("error", "The listing you are trying to edit does not exist.");
    return res.redirect("/listings");
  }

  const listing = listingObj.data;

  if (listing.thumbnail && listing.thumbnail.url) {
    listing.thumbnail.url = getOptimizedUrl(listing.thumbnail.url);
  }

  if (listing.images) {
    listing.images = listing.images.map((image) => {
      image.url = getOptimizedUrl(image.url);
      return image;
    });
  }

  return res.render("listings/edit.ejs", {
    listing,
    pageStyles: ["/css/newForm.css"],
    pageScripts: ["/js/newForm.js"],
  });
};

// Update listing details, handle new/removed images, and save changes
module.exports.updateListing = async (req, res) => {
  let { id } = req.params;

  // 1. Find
  const listingObj = await Listing.findById(id);
  const listing = listingObj.data; // Reference to data

  // 2. Update Properties
  const updates = req.body.listing;

  if (res.locals.location) {
    listing.location = res.locals.location;
  }

  // Merge updates into listing
  Object.assign(listing, updates);

  // 3. Handle Images
  if (req.files && req.files["listing[thumbnail]"]) {
    const file = req.files["listing[thumbnail]"][0];
    if (listing.thumbnail && listing.thumbnail.filename) {
      await cloudinary.uploader.destroy(listing.thumbnail.filename);
    }
    listing.thumbnail = { url: file.path, filename: file.filename };
  }

  if (req.files && req.files["listing[images]"]) {
    const newImages = req.files["listing[images]"].map((file) => ({
      url: file.path,
      filename: file.filename,
    }));
    if (!listing.images) listing.images = [];
    listing.images.push(...newImages);
  }

  // 4. Handle Deleted Images
  if (req.body.deleteImages && req.body.deleteImages.length) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    // Filter out deleted images
    listing.images = listing.images.filter(
      (img) => !req.body.deleteImages.includes(img.filename)
    );
  }

  // 5. Save
  await listingObj.save();

  req.flash("success", "Listing updated successfully!");
  return res.redirect(`/listings/${id}`);
};

// Delete a listing, including its reviews and images from Cloudinary
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;

  // We fetch first to get image filenames for Cloudinary
  const listingObj = await Listing.findById(id);
  if (listingObj) {
    const listing = listingObj.data;

    const filenamesToDelete = [];

    if (listing.images && listing.images.length > 0) {
      listing.images.forEach((image) => {
        filenamesToDelete.push(image.filename);
      });
    }

    // 2. Collect Thumbnail (FIX START)
    if (listing.thumbnail && listing.thumbnail.filename) {
      filenamesToDelete.push(listing.thumbnail.filename);
    }
    // (FIX END)

    // 3. Delete everything from Cloudinary in one go
    if (filenamesToDelete.length > 0) {
      await cloudinary.api.delete_resources(filenamesToDelete);
    }

    // 4. Delete from Database
    await Listing.findByIdAndDelete(id);
  }

  req.flash("success", "Listing deleted successfully!");
  return res.redirect("/listings/myListings");
};

// Search and filter listings by location, dates, guests, price, type, and amenities
module.exports.searchListing = async (req, res) => {
  try {
    const {
      destination,
      checkin,
      checkout,
      guests,
      type,
      min_price,
      max_price,
      bedrooms,
      bathrooms,
      property_type,
      amenities,
    } = req.query;

    let selector = {}; // Cloudant uses 'selector', not 'filter'
    let totalDays = 1;

    // 1. Handle Date Availability (Manual Distinct logic)
    if (checkin && checkout) {
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);

      // Basic booking query
      const bookings = await Booking.find({
        status: "confirmed",
        checkIn: { $lt: checkoutDate.toISOString() },
        checkOut: { $gt: checkinDate.toISOString() },
      });

      // Get distinct listing IDs manually
      const unavailableIds = [...new Set(bookings.map((b) => b.data.listing))];

      if (unavailableIds.length > 0) {
        selector._id = { $nin: unavailableIds };
      }
    }

    // 2. Handle Destination (Regex)
    if (destination) {
      // Cloudant Regex syntax: (?i) means case insensitive
      const regexPattern = `(?i)${destination}`;
      selector["$or"] = [
        { "address.city": { $regex: regexPattern } },
        { "address.state": { $regex: regexPattern } },
        { "address.country": { $regex: regexPattern } },
      ];
    }

    if (guests) selector["details.guests"] = { $gte: Number(guests) };
    if (bedrooms) selector["details.bedrooms"] = { $gte: Number(bedrooms) };
    if (bathrooms) selector["details.bathrooms"] = { $gte: Number(bathrooms) };

    // Price Range
    if (min_price || max_price) {
      selector.price = {};
      if (min_price) selector.price["$gte"] = Number(min_price);
      if (max_price) selector.price["$lte"] = Number(max_price);
    }

    if (type && type !== "any") {
      // Case insensitive exact match
      selector.typeOfPlace = { $regex: `(?i)^${type.replace("_", " ")}$` };
    }

    if (property_type) {
      const formatted = property_type.replaceAll("_", " ");
      selector.propertyType = { $regex: `(?i)^${formatted}$` };
    }

    // Amenities (Complex: $all is supported in recent Cloudant versions)
    if (amenities && amenities.length > 0) {
      const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
      // For Cloudant, we might need to check if the array exists
      // This is a simplification. Exact array matching in Cloudant can be tricky without specific indexes.
      // We will try the standard $all operator.
      selector.amenities = { $all: amenitiesArray };
    }

    // Use the new Listing model to find
    const allListingObjs = await Listing.find(selector);
    const allListings = allListingObjs.map((obj) => obj.data); // Unwrap data

    if (!allListings.length) {
      req.flash(
        "error",
        "No listings available for your search or filter criteria."
      );
      return res.redirect("/listings");
    }

    return res.render("listings/index.ejs", {
      allListings,
      destination: req.query.destination || "",
      checkin: req.query.checkin || "",
      checkout: req.query.checkout || "",
      guests: req.query.guests || 1,
      totalDays: totalDays || 1,
      hasSearch: !!(req.query.destination || req.query.checkin),
      pageStyles: ["/css/index.css"],
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong with your search.");
    res.redirect("/listings");
  }
};

// Get all booked dates for a listing (optionally excluding one booking for updates)
module.exports.getBookedDates = async (req, res) => {
  let { id, bookingId } = req.params;
  const selector = { listing: id, status: "confirmed" };

  if (bookingId) {
    selector._id = { $ne: bookingId };
  }

  const bookings = await Booking.find(selector);
  const bookedDates = bookings.map((b) => ({
    start: b.data.checkIn,
    end: b.data.checkOut,
  }));
  res.status(200).json(bookedDates);
};

// Show all listings created by the logged-in user, split into active and inactive
module.exports.showUserListings = async (req, res) => {
  const listingObjs = await Listing.find({ owner: req.user._id });
  const listings = listingObjs.map((l) => l.data);

  const activeListing = listings.filter((l) => l.status === "available");
  const inactiveListing = listings.filter((l) => l.status === "unavailable");

  return res.render("listings/myListing.ejs", {
    activeListing,
    inactiveListing,
    pageStyles: ["/css/myListing.css"],
    pageScripts: ["/js/myListing.js"],
  });
};

// Toggle a listing’s status between available and unavailable
module.exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const listingObj = await Listing.findById(id);

  if (listingObj) {
    listingObj.data.status =
      listingObj.data.status === "available" ? "unavailable" : "available";
    await listingObj.save();
    req.flash(
      "success",
      `Listing status updated to ${listingObj.data.status}.`
    );
  } else {
    req.flash("error", "Listing not found");
  }

  res.redirect("/listings/myListings");
};
