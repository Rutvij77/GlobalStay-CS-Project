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

// For Cloudant
const service = require("../config/cloudant.js");
// We need the Review model to handle the "Cascade Delete" (deleting reviews when listing is deleted)
const Review = require("./review.js");

const DB_NAME = "listings";

class Listing {
  constructor(data) {
    // 1. VALIDATION (Replacing Mongoose 'required' and 'enum')
    if (!data.title)
      throw new Error("Listing validation failed: Title is required.");
    if (!data.price)
      throw new Error("Listing validation failed: Price is required.");
    if (!data.description)
      throw new Error("Listing validation failed: Description is required.");

    // Validate Enums: Type of Place
    const allowedTypes = ["Entire home", "Room"];
    if (data.typeOfPlace && !allowedTypes.includes(data.typeOfPlace)) {
      throw new Error(
        `Invalid typeOfPlace. Must be one of: ${allowedTypes.join(", ")}`
      );
    }

    // Validate Enums: Property Type
    const allowedProperties = ["House", "Flat", "Guest house", "Hotel"];
    if (data.propertyType && !allowedProperties.includes(data.propertyType)) {
      throw new Error(
        `Invalid propertyType. Must be one of: ${allowedProperties.join(", ")}`
      );
    }

    // 2. DEFAULT VALUES
    if (!data.reviews) data.reviews = [];
    if (!data.reviewCount) data.reviewCount = 0;
    if (!data.avgRating) data.avgRating = 0;
    if (!data.status) data.status = "available";

    // Handle Location (GeoJSON standard)
    // If user provided coordinates, ensure type is "Point"
    if (data.location && !data.location.type) {
      data.location.type = "Point";
    }

    this.data = data;
  }

  // 3. SAVE (Create or Update)
  async save() {
    try {
      if (!this.data.createdAt) {
        this.data.createdAt = new Date().toISOString();
      }

      // Rounding logic for avgRating (from your Mongoose setter)
      if (this.data.avgRating) {
        this.data.avgRating = Math.round(this.data.avgRating * 10) / 10;
      }

      const response = await service.postDocument({
        db: DB_NAME,
        document: this.data,
      });

      this.data._id = response.result.id;
      this.data._rev = response.result.rev;
      return this.data;
    } catch (err) {
      console.error("Cloudant Listing Save Error:", err);
      throw err;
    }
  }

  // 4. FIND ALL (With optional limit/filter)
  static async find(selector = {}) {
    try {
      // Warning: Searching without an Index in Cloudant can be slow.
      // For production, you should create an index on 'status' or 'city'.
      const response = await service.postFind({
        db: DB_NAME,
        selector: selector,
        limit: 50, // Safety limit
      });

      // Convert raw docs to Listing class instances
      return response.result.docs.map((doc) => new Listing(doc));
    } catch (err) {
      if (err.code === 404) return []; // DB not found
      console.error("Cloudant Find Error:", err);
      return [];
    }
  }

  // 5. FIND BY ID
  static async findById(id) {
    try {
      const response = await service.getDocument({
        db: DB_NAME,
        docId: id,
      });
      return new Listing(response.result);
    } catch (err) {
      if (err.code === 404) return null;
      throw err;
    }
  }

  // 6. DELETE BY ID (Replacing the Mongoose Middleware)
  static async findByIdAndDelete(id) {
    try {
      // Step A: Find the listing first (we need the _rev and the reviews array)
      const listingDoc = await service.getDocument({
        db: DB_NAME,
        docId: id,
      });

      const listing = listingDoc.result;

      // Step B: Manual Cascade Delete of Reviews
      // (Replacing: ListingSchema.post("findOneAndDelete"...))
      if (listing.reviews && listing.reviews.length > 0) {
        console.log(
          `Deleting ${listing.reviews.length} reviews for listing ${id}`
        );
        for (let reviewId of listing.reviews) {
          // Call the delete method on the Review model we created earlier
          await Review.deleteById(reviewId);
        }
      }

      // Step C: Delete the Listing
      await service.deleteDocument({
        db: DB_NAME,
        docId: id,
        rev: listing._rev,
      });

      return true;
    } catch (err) {
      console.error("Cloudant Listing Delete Error:", err);
      return false;
    }
  }
}

module.exports = Listing;
