// const Booking = require("../models/booking.js");
// const Listing = require("../models/listing.js");
// const mongoose = require("mongoose");

// // Create a new booking for a listing and confirm it
// module.exports.addBooking = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const booking = new Booking({
//       listing: new mongoose.Types.ObjectId(id),
//       user: req.user._id,
//       checkIn: req.body.booking.checkIn,
//       checkOut: req.body.booking.checkOut,
//       guests: req.body.booking.guests,
//       totalAmount: req.body.booking.totalAmount,
//       status: "confirmed",
//     });

//     await booking.save();

//     req.flash("success", "Booking confirmed successfully!");
//     return res.redirect(`/listings/${id}`);
//   } catch (err) {
//     console.error("Booking error:", err);
//     req.flash("error", "Something went wrong while creating the booking.");
//     return res.redirect(`/listings/${id}`);
//   }
// };

// // Get all bookings for the logged-in user, grouped into current and past bookings
// module.exports.allBooking = async (req, res) => {
//   const bookings = await Booking.find({ user: req.user._id })
//     .populate("listing")
//     .populate("user");

//   const formatDate = (date) =>
//     date.toLocaleDateString("en-US", {
//       weekday: "short",
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     });

//   const startOfToday = new Date();
//   startOfToday.setHours(0, 0, 0, 0);

//   const currentBookings = bookings
//     .filter((b) => new Date(b.checkOut) >= startOfToday)
//     .map((b) => {
//       const bookingObj = b.toObject ? b.toObject() : b;
//       return {
//         ...bookingObj,
//         checkInFormatted: formatDate(bookingObj.checkIn),
//         checkOutFormatted: formatDate(bookingObj.checkOut),
//       };
//     })
//     .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

//   const pastBookings = bookings
//     .filter((b) => new Date(b.checkOut) < startOfToday)
//     .map((b) => {
//       const bookingObj = b.toObject ? b.toObject() : b;
//       if (bookingObj.status !== "canceled") {
//         bookingObj.status = "completed";
//       }
//       return {
//         ...bookingObj,
//         checkInFormatted: formatDate(bookingObj.checkIn),
//         checkOutFormatted: formatDate(bookingObj.checkOut),
//       };
//     })
//     .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

//   return res.render("bookings/myBookings.ejs", {
//     currentBookings: currentBookings || [],
//     pastBookings: pastBookings || [],
//     pageStyles: ["/css/myBooking.css"],
//     pageScripts: ["/js/myBooking.js"],
//   });
// };

// // Cancel a booking by updating its status to "canceled"
// module.exports.cancelBooking = async (req, res) => {
//   const id = req.id;
//   const booking = req.booking;

//   booking.status = "canceled";
//   await booking.save();

//   req.flash("success", "Your booking has been successfully cancelled.");
//   res.redirect(`/listings/${id}/bookings/myBookings`);
// };

// // Update an existing booking’s details (guests, dates, total amount)
// module.exports.updateBooking = async (req, res) => {
//   const { booking } = req;
//   const { listing } = req;
//   const { guests } = req;
//   const { checkIn, checkOut } = req;
//   const totalAmount = req.calculatedTotal;

//   try {
//     booking.guests = guests;
//     booking.checkIn = checkIn;
//     booking.checkOut = checkOut;
//     booking.totalAmount = totalAmount;

//     await booking.save();

//     req.flash("success", "Booking updated successfully!");
//     res.redirect(`/listings/${listing._id}/bookings/myBookings`);
//   } catch (err) {
//     console.error("Error updating booking:", err);
//     req.flash("error", "Something went wrong. Please try again.");
//     res.redirect(`/listings/${listing._id}/bookings/myBookings`);
//   }
// };

// // Get all bookings for a specific listing (for the host), marking past bookings as completed
// module.exports.Bookings = async (req, res) => {
//   const { id } = req.params;
//   const listing = await Listing.findById(id, "title");

//   let bookings = await Booking.find({ listing: id })
//     .populate("user", "username")
//     .lean();

//   const today = new Date();

//   bookings = bookings.map((bookingObj) => {
//     const checkOutDate = new Date(bookingObj.checkOut);
//     if (bookingObj.status !== "canceled" && checkOutDate < today) {
//       bookingObj.status = "completed";
//     }
//     return bookingObj;
//   });

//   return res.render("bookings/bookings.ejs", {
//     bookings,
//     listing,
//     pageStyles: ["/css/booking.css"],
//     pageScripts: ["/js/booking.js"],
//   });
// };
