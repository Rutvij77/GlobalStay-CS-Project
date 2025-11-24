const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const Booking = require("../models/booking");
const { cloudinary } = require("../cloudConfig");
const axios = require("axios");

// Show all available listings
module.exports.getAllListings = async (req, res) => {
  const allListings = await Listing.find({ status: "available" });
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
    const listingData = req.body.listing;

    listingData.location = res.locals.location;

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
    newListing.owner = req.user._id;
    await newListing.save();

    req.flash("success", "Your listing has been successfully created!");
    res.redirect(`/listings/${newListing._id}`);
  } catch (err) {
    next(err);
  }
};

// Show details of a single listing, including reviews, owner, and booked dates
module.exports.getListingById = async (req, res) => {
  let { id } = req.params;
  const { checkin, checkout, guests, totalDays } = req.query;

  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "The listing you are looking for does not exist.");
    return res.redirect("/listings");
  }

  const bookings = await Booking.find({ listing: id, status: "confirmed" });
  const bookedDates = bookings.map((b) => ({
    start: b.checkIn,
    end: b.checkOut,
  }));

  const createdAt = new Date(listing.owner.createdAt);
  const years = new Date().getFullYear() - createdAt.getFullYear();
  return res.render("listings/show.ejs", {
    listing,
    bookedDates,
    hostYears: years,
    checkin: checkin || "",
    checkout: checkout || "",
    guests: guests || 1,
    totalDays: totalDays || 1,
    pageStyles: ["/css/show.css"],
    pageScripts: ["/js/show.js"],
  });
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
  const listing = await Listing.findById(id).lean();

  if (!listing) {
    req.flash("error", "The listing you are trying to edit does not exist.");
    return res.redirect("/listings");
  }

  if (listing.thumbnail && listing.thumbnail.url) {
    listing.thumbnail.url = getOptimizedUrl(listing.thumbnail.url);
  }

  listing.images = listing.images.map((image) => {
    image.url = getOptimizedUrl(image.url);
    return image;
  });

  return res.render("listings/edit.ejs", {
    listing,
    pageStyles: ["/css/newForm.css"],
    pageScripts: ["/js/newForm.js"],
  });
};

// Update listing details, handle new/removed images, and save changes
module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

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
    listing.images.push(...newImages);
  }

  await listing.save();

  if (req.body.deleteImages && req.body.deleteImages.length) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await listing.updateOne({
      $pull: { images: { filename: { $in: req.body.deleteImages } } },
    });
  }

  req.flash("success", "Listing updated successfully!");
  return res.redirect(`/listings/${id}`);
};

// Delete a listing, including its reviews and images from Cloudinary
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;

  const listing = await Listing.findById(id);

  if (listing.reviews && listing.reviews.length > 0) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }

  if (listing.images && listing.images.length > 0) {
    const filenames = listing.images.map((image) => image.filename);
    await cloudinary.api.delete_resources(filenames);
  }

  await Listing.findByIdAndDelete(id);

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

    let filter = {};
    let totalDays = 1;

    if (checkin && checkout) {
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);

      totalDays = Math.ceil(
        (checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (totalDays < 1) totalDays = 1;

      const unavailableListingIds = await Booking.find({
        status: "confirmed",
        checkIn: { $lt: checkoutDate },
        checkOut: { $gt: checkinDate },
      }).distinct("listing");

      if (unavailableListingIds.length > 0) {
        filter._id = { $nin: unavailableListingIds };
      }
    }

    if (destination) {
      const regex = new RegExp(destination, "i");
      filter.$or = [
        { "address.city": regex },
        { "address.state": regex },
        { "address.country": regex },
      ];
    }

    if (guests) {
      filter["details.guests"] = { $gte: guests };
    }

    if (min_price && max_price) {
      filter.price = { $gte: Number(min_price), $lte: Number(max_price) };
    } else if (min_price) {
      filter.price = { $gte: Number(min_price) };
    } else if (max_price) {
      filter.price = { $lte: Number(max_price) };
    }

    if (type && type !== "any") {
      filter.typeOfPlace = new RegExp(`^${type.replace("_", " ")}$`, "i");
    }

    if (bedrooms) {
      filter["details.bedrooms"] = { $gte: Number(bedrooms) };
    }
    if (bathrooms) {
      filter["details.bathrooms"] = { $gte: Number(bathrooms) };
    }

    if (property_type) {
      const formattedPropertyType = property_type.replaceAll("_", " ");
      filter.propertyType = new RegExp(`^${formattedPropertyType}$`, "i");
    }

    if (amenities && amenities.length > 0) {
      const amenitiesArray = Array.isArray(amenities) ? amenities : [amenities];
      filter.amenities = {
        $all: amenitiesArray.map((a) => new RegExp(a, "i")),
      };
    }

    const allListings = await Listing.find(filter);

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
      hasSearch: !!(
        req.query.destination ||
        req.query.checkin ||
        req.query.checkout ||
        req.query.guests
      ),
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

  const query = { listing: id, status: "confirmed" };
  if (bookingId) {
    query._id = { $ne: bookingId };
  }

  const bookings = await Booking.find(query);

  const bookedDates = bookings.map((b) => ({
    start: b.checkIn,
    end: b.checkOut,
  }));
  res.status(200).json(bookedDates);
};

// Show all listings created by the logged-in user, split into active and inactive
module.exports.showUserListings = async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id });

  const activeListing = listings.filter(
    (listing) => listing.status === "available"
  );
  const inactiveListing = listings.filter(
    (listing) => listing.status === "unavailable"
  );

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

  let listing = await Listing.findById(id);

  listing.status = listing.status === "available" ? "unavailable" : "available";
  await listing.save();

  req.flash("success", `Listing status updated to ${listing.status}.`);
  res.redirect("/listings/myListings");
};
