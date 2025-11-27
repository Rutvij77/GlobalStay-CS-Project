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

// For Cloudant
const service = require("../config/cloudant.js");

const DB_NAME = "bookings";

class Booking {
  constructor(data) {
    // 1. REQUIRED FIELDS
    if (!data.listing)
      throw new Error("Booking validation failed: Listing ID is required.");
    if (!data.user)
      throw new Error("Booking validation failed: User ID is required.");
    if (!data.checkIn)
      throw new Error("Booking validation failed: checkIn date is required.");
    if (!data.checkOut)
      throw new Error("Booking validation failed: checkOut date is required.");
    if (!data.guests)
      throw new Error("Booking validation failed: Guest count is required.");
    if (!data.totalAmount)
      throw new Error("Booking validation failed: Total amount is required.");

    // 2. DATE VALIDATION (checkOut must be after checkIn)
    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);

    if (checkOutDate <= checkInDate) {
      throw new Error(
        "Booking validation failed: End date (checkOut) must be after start date (checkIn)."
      );
    }

    // 3. ENUM VALIDATION
    const validStatuses = ["pending", "confirmed", "canceled"];
    // Default to "confirmed" if missing (matching your Mongoose default)
    if (!data.status) {
      data.status = "confirmed";
    } else if (!validStatuses.includes(data.status)) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    this.data = data;
  }

  // 4. SAVE
  async save() {
    try {
      // Timestamps
      const now = new Date().toISOString();
      if (!this.data.createdAt) this.data.createdAt = now;
      this.data.updatedAt = now; // Always update this on save

      const response = await service.postDocument({
        db: DB_NAME,
        document: this.data,
      });

      this.data._id = response.result.id;
      this.data._rev = response.result.rev;
      return this.data;
    } catch (err) {
      console.error("Cloudant Booking Save Error:", err);
      throw err;
    }
  }

  // 5. FIND (Generic search)
  // Useful for: Finding all bookings for a specific User OR a specific Listing
  static async find(selector) {
    try {
      const response = await service.postFind({
        db: DB_NAME,
        selector: selector,
        limit: 100, // Safety limit
      });
      return response.result.docs.map((doc) => new Booking(doc));
    } catch (err) {
      if (err.code === 404) return [];
      console.error("Cloudant Booking Find Error:", err);
      return [];
    }
  }

  static async findById(id) {
    try {
      const response = await service.getDocument({
        db: "bookings", // Make sure this matches your Cloudant DB name
        docId: id,
      });
      // Return a new instance of the Booking class
      return new Booking(response.result);
    } catch (err) {
      // If Cloudant returns 404 (Not Found), return null like Mongoose does
      if (err.code === 404) {
        return null;
      }
      throw err;
    }
  }

  // 6. DELETE
  static async deleteById(id) {
    try {
      const doc = await service.getDocument({
        db: DB_NAME,
        docId: id,
      });

      await service.deleteDocument({
        db: DB_NAME,
        docId: id,
        rev: doc.result._rev,
      });
      return true;
    } catch (err) {
      console.error("Cloudant Booking Delete Error:", err);
      return false;
    }
  }
}

module.exports = Booking;
