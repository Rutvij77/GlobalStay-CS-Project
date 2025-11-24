// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
// const passportLocalMongoose = require("passport-local-mongoose");

// const userSchema = new Schema({
//   email: {
//     type: String,
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now(),
//   },
// });

// userSchema.plugin(passportLocalMongoose);

// module.exports = mongoose.model("User", userSchema);

// for Appid
// const mongoose = require("mongoose");
// const Schema = mongoose.Schema;

// const userSchema = new Schema({
//   appIdSub: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   email: {
//     type: String,
//     required: true,
//   },
//   username: {
//     type: String,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// module.exports = mongoose.model("User", userSchema);

// For cloudant
const service = require("../config/cloudant.js");

const DB_NAME = "users";

class User {
  constructor(data) {
    if (!data.email) {
      throw new Error("User validation failed: 'email' is required.");
    }
    if (!data.appIdSub) {
      throw new Error("User validation failed: 'appIdSub' is required.");
    }
    this.data = data;
  }

  // Mimic Mongoose's .save()
  async save() {
    try {
      // Add createdAt if missing
      if (!this.data.createdAt) {
        this.data.createdAt = new Date().toISOString();
      }

      if (!this.data.username) {
        this.data.username = null;
      }

      // Send to Cloudant
      const response = await service.postDocument({
        db: DB_NAME,
        document: this.data,
      });

      // Update local object with the ID Cloudant gave us
      this.data._id = response.result.id;
      this.data._rev = response.result.rev;

      return this.data;
    } catch (err) {
      console.error("Error saving to Cloudant:", err);
      throw err;
    }
  }

  // Mimic Mongoose's .findOne()
  // Usage: await User.findOne({ appIdSub: "12345" })
  static async findOne(selector) {
    try {
      const response = await service.postFind({
        db: DB_NAME,
        selector: selector, // Cloudant "Mango Query"
      });

      if (response.result.docs.length > 0) {
        // Return a new User instance so we can read .name, .email etc.
        const foundUser = new User(response.result.docs[0]);

        // IMPORTANT: We need to return the direct object for passport to read properties
        // But we attach the save method just in case.
        return foundUser.data;
      }
      return null;
    } catch (err) {
      // If the database doesn't exist yet, standard Cloudant error
      if (err.code === 404) {
        console.log(`Database '${DB_NAME}' not found.`);
      }
      console.error("Error finding user:", err);
      return null;
    }
  }
}

module.exports = User;
