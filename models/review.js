// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const reviewSchema = new Schema({
//   comment: String,
//   rating: {
//     type: Number,
//     min: 1,
//     max: 5,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now(),
//   },
//   author: {
//     type: Schema.Types.ObjectId,
//     ref: "User",
//   },
// });

// module.exports = mongoose.model("Review", reviewSchema);

// For Cloudant
const service = require("../config/cloudant.js");

// The database name you created in Cloudant
const DB_NAME = "reviews";

class Review {
  constructor(data) {
    // 1. VALIDATION (Mimic Mongoose min/max)
    if (data.rating) {
      const rating = Number(data.rating);
      if (rating < 1 || rating > 5) {
        throw new Error("Validation Error: Rating must be between 1 and 5.");
      }
    }

    this.data = data;
  }

  // 2. SAVE (Create or Update)
  async save() {
    try {
      // Default Date
      if (!this.data.createdAt) {
        this.data.createdAt = new Date().toISOString();
      }

      const response = await service.postDocument({
        db: DB_NAME,
        document: this.data,
      });

      this.data._id = response.result.id;
      this.data._rev = response.result.rev;
      return this.data;
    } catch (err) {
      console.error("Cloudant Review Save Error:", err);
      throw err;
    }
  }

  // 3. FIND BY ID (Mimic Review.findById)
  static async findById(id) {
    try {
      const response = await service.getDocument({
        db: DB_NAME,
        docId: id,
      });
      return new Review(response.result);
    } catch (err) {
      if (err.code === 404) return null;
      throw err;
    }
  }

  // 4. DELETE (Mimic Review.findByIdAndDelete)
  static async deleteById(id) {
    try {
      // Cloudant requires the "Revision ID" (_rev) to delete something.
      // So we must Find it first, then Delete it.
      const doc = await service.getDocument({
        db: DB_NAME,
        docId: id,
      });

      await service.deleteDocument({
        db: DB_NAME,
        docId: id,
        rev: doc.result._rev, // Required for deletion
      });

      return true;
    } catch (err) {
      console.error("Cloudant Review Delete Error:", err);
      return false;
    }
  }
}

module.exports = Review;
