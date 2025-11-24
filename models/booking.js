// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const bookingSchema = new Schema(
//   {
//     listing: {
//       type: Schema.Types.ObjectId,
//       ref: "Listing",
//       required: true,
//       index: true,
//     },
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     checkIn: {
//       type: Date,
//       required: true,
//     },
//     checkOut: {
//       type: Date,
//       required: true,
//       validate: {
//         validator: function (value) {
//           return value > this.checkIn;
//         },
//         message: "End date must be after start date",
//       },
//     },
//     guests: {
//       type: Number,
//       required: true,
//     },
//     totalAmount: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ["pending", "confirmed", "canceled"],
//       default: "confirmed",
//     },
//   },
//   { timestamps: true }
// );

// bookingSchema.index({ listing: 1, startDate: 1, endDate: 1 });

// module.exports = mongoose.model("Booking", bookingSchema);
