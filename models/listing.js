// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
// const Review = require("./review.js");

// const ListingSchema = new Schema({
//   title: {
//     type: String,
//     required: true,
//   },

//   details: {
//     guests: { type: Number, required: true },
//     bedrooms: { type: Number, required: true },
//     bathrooms: { type: Number, required: true },
//   },

//   typeOfPlace: {
//     type: String,
//     enum: ["Entire home", "Room"],
//     required: true,
//   },

//   propertyType: {
//     type: String,
//     enum: ["House", "Flat", "Guest house", "Hotel"],
//     required: true,
//   },

//   description: { type: String, required: true },

//   thumbnail: {
//     url: String,
//     filename: String,
//   },

//   images: [
//     {
//       url: String,
//       filename: String,
//       _id: false,
//     },
//   ],

//   amenities: [
//     {
//       type: String,
//     },
//   ],

//   price: { type: Number, required: true },

//   address: {
//     houseNumber: {
//       type: String,
//       required: true,
//     },
//     buildingName: {
//       type: String,
//       required: true,
//     },
//     street: {
//       type: String,
//       required: true,
//     },
//     city: {
//       type: String,
//       required: true,
//     },
//     state: {
//       type: String,
//       required: true,
//     },
//     code: {
//       type: String,
//       required: true,
//     },
//     country: {
//       type: String,
//       required: true,
//     },
//   },

//   location: {
//     type: {
//       type: String,
//       enum: ["Point"],
//       required: true,
//     },
//     coordinates: {
//       type: [Number],
//       required: true,
//     },
//   },

//   reviews: [
//     {
//       type: Schema.Types.ObjectId,
//       ref: "Review",
//     },
//   ],

//   avgRating: { type: Number, default: 0, set: (v) => Math.round(v * 10) / 10 },

//   reviewCount: { type: Number, default: 0 },

//   owner: {
//     type: Schema.Types.ObjectId,
//     ref: "User",
//   },

//   status: {
//     type: String,
//     enum: ["available", "unavailable"],
//     default: "available",
//   },
// });

// ListingSchema.post("findOneAndDelete", async (listing) => {
//   if (listing) {
//     await Review.deleteMany({ _id: { $in: listing.reviews } });
//   }
// });

// const Listing = mongoose.model("Listing", ListingSchema);
// module.exports = Listing;
