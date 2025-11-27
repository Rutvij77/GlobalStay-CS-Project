const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js"); // Needed to fetch User details manually

// Create a new booking
module.exports.addBooking = async (req, res) => {
  try {
    const { id } = req.params;

    // Create new Booking Instance
    // Cloudant IDs are strings, so we don't need mongoose.Types.ObjectId
    const booking = new Booking({
      listing: id,
      user: req.user._id,
      checkIn: req.body.booking.checkIn,
      checkOut: req.body.booking.checkOut,
      guests: req.body.booking.guests,
      totalAmount: req.body.booking.totalAmount,
      status: "confirmed",
    });

    await booking.save();

    req.flash("success", "Booking confirmed successfully!");
    return res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error("Booking error:", err);
    req.flash("error", "Something went wrong while creating the booking.");
    return res.redirect(`/listings/${id}`);
  }
};

// Get all bookings for the logged-in user (My Bookings)
module.exports.allBooking = async (req, res) => {
  try {
    // 1. Fetch Bookings for current user
    const bookingObjs = await Booking.find({ user: req.user._id });

    // 2. Unwrap Data & Manual Populate (Listing)
    // We map over the bookings and fetch the Listing details for each one
    const bookings = [];
    for (let bObj of bookingObjs) {
      let bookingData = bObj.data;

      // Manual Populate: Listing
      if (bookingData.listing) {
        let listingObj = await Listing.findById(bookingData.listing);
        // Attach listing data if found, otherwise placeholder
        bookingData.listing = listingObj
          ? listingObj.data
          : { title: "Unknown Listing" };
      }

      if (bookingData.user) {
        let userObj = await User.findById(bookingData.user);
        // Attach a new property 'guestName' to the data
        bookingData.guestName = userObj
          ? userObj.data.username
          : "Unknown Guest";
      } else {
        bookingData.guestName = "Unknown Guest";
      }

      bookings.push(bookingData);
    }

    // 3. Date Formatting Helper
    const formatDate = (dateString) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 4. Filter & Map for View
    // Note: We removed .toObject() because bookingData is already a plain object
    const currentBookings = bookings
      .filter((b) => new Date(b.checkOut) >= startOfToday)
      .map((b) => ({
        ...b,
        checkInFormatted: formatDate(b.checkIn),
        checkOutFormatted: formatDate(b.checkOut),
      }))
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

    const pastBookings = bookings
      .filter((b) => new Date(b.checkOut) < startOfToday)
      .map((b) => {
        if (b.status !== "canceled") {
          b.status = "completed";
        }
        return {
          ...b,
          checkInFormatted: formatDate(b.checkIn),
          checkOutFormatted: formatDate(b.checkOut),
        };
      })
      .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

    return res.render("bookings/myBookings.ejs", {
      currentBookings: currentBookings || [],
      pastBookings: pastBookings || [],
      pageStyles: ["/css/myBooking.css"],
      pageScripts: ["/js/myBooking.js"],
    });
  } catch (err) {
    console.error("All Booking Error:", err);
    req.flash("error", "Could not load bookings.");
    return res.redirect("/listings");
  }
};

// Cancel a booking
module.exports.cancelBooking = async (req, res) => {
  const id = req.id;
  const bookingObj = req.booking; // This is the Class Instance from Middleware

  // Update data property on the instance
  bookingObj.data.status = "canceled";

  // Save the instance
  await bookingObj.save();

  req.flash("success", "Your booking has been successfully cancelled.");
  res.redirect(`/listings/${id}/bookings/myBookings`);
};

// Update booking details
// module.exports.updateBooking = async (req, res) => {
//   const bookingObj = req.booking; // Class Instance from Middleware
//   const { listing } = req; // Unwrap data from Middleware if needed, but here just ID used
//   const { guests } = req;
//   const { checkIn, checkOut } = req;
//   const totalAmount = req.calculatedTotal;

//   try {
//     // Update properties
//     bookingObj.data.guests = guests;
//     bookingObj.data.checkIn = checkIn;
//     bookingObj.data.checkOut = checkOut;
//     bookingObj.data.totalAmount = totalAmount;

//     await bookingObj.save();

//     req.flash("success", "Booking updated successfully!");
//     res.redirect(`/listings/${listing._id}/bookings/myBookings`);
//   } catch (err) {
//     console.error("Error updating booking:", err);
//     req.flash("error", "Something went wrong. Please try again.");
//     res.redirect(`/listings/${listing._id}/bookings/myBookings`);
//   }
// };

module.exports.updateBooking = async (req, res, next) => {
  try {
    const { id, bookingId } = req.params; // 'id' is listingId, 'bookingId' is the booking

    // 1. Fetch the booking using your Class Method
    const bookingObj = await Booking.findById(bookingId);

    // 2. Safety Check: Did we find it?
    if (!bookingObj) {
      req.flash("error", "Booking not found!");
      return res.redirect(`/listings/${id}/bookings`);
    }

    // 3. Update the DATA inside the object
    // Note: accessing .data because that's how we set up the Class
    bookingObj.data.checkIn = req.body.booking.checkIn;
    bookingObj.data.checkOut = req.body.booking.checkOut;
    bookingObj.data.guests = req.body.booking.guests; // <--- This was crashing before

    // 4. Save using the Class method we added in Step 1
    await bookingObj.save();

    req.flash("success", "Booking updated successfully!");
    res.redirect(`/listings/${id}/bookings/myBookings`);
  } catch (err) {
    console.log("Update Error:", err);
    next(err);
  }
};

// Get bookings for a specific listing (Host View)
module.exports.Bookings = async (req, res) => {
  const { id } = req.params;

  // Fetch Listing Title
  const listingObj = await Listing.findById(id);
  const listing = listingObj ? listingObj.data : { title: "Unknown" };

  // Fetch Bookings
  const bookingObjs = await Booking.find({ listing: id });

  // Unwrap & Manual Populate (User)
  let bookings = [];
  for (let bObj of bookingObjs) {
    let bData = bObj.data;

    // Manual Populate: User (Guest)
    // We assume User model has findOne({_id: ...}) or similar capability via selector
    if (bData.user) {
      let userObj = await User.findById(bData.user);
      // Attach a new property 'guestName' to the data
      bData.guestName = userObj ? userObj.data.username : "Unknown Guest";
    } else {
      bData.guestName = "Unknown Guest";
    }
    bookings.push(bData);
  }

  const today = new Date();

  // Update status for display (Client-side logic moved here)
  bookings = bookings.map((bookingData) => {
    const checkOutDate = new Date(bookingData.checkOut);
    if (bookingData.status !== "canceled" && checkOutDate < today) {
      bookingData.status = "completed";
    }
    return bookingData;
  });

  return res.render("bookings/bookings.ejs", {
    bookings,
    listing,
    pageStyles: ["/css/booking.css"],
    pageScripts: ["/js/booking.js"],
  });
};
