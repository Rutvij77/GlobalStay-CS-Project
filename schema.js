const Joi = require("joi");

module.exports.listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number().required().min(0),
    details: Joi.object({
      guests: Joi.number().integer().min(1).required(),
      bedrooms: Joi.number().integer().min(1).required(),
      bathrooms: Joi.number().integer().min(1).required(),
    }).required(),
    typeOfPlace: Joi.string().valid("Entire home", "Room").required(),
    propertyType: Joi.string()
      .valid("House", "Flat", "Guest house", "Hotel")
      .required(),
    amenities: Joi.array().items(Joi.string()),
    address: Joi.object({
      houseNumber: Joi.string().required(),
      buildingName: Joi.string().required(),
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      code: Joi.string().required(),
      country: Joi.string().required(),
    }).required(),
    avgRating: Joi.number().min(0).max(5).default(0),
    reviewCount: Joi.number().integer().min(0).default(0),
  }).required(),
  deleteImages: Joi.array().items(Joi.string()),
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    comment: Joi.string().required(),
  }).required(),
});

module.exports.userSchema = Joi.object({
  user: Joi.object({
    email: Joi.string().email().required(),
  }).required(),
});

module.exports.bookingSchema = Joi.object({
  booking: Joi.object({
    checkIn: Joi.date().required(),
    checkOut: Joi.date().required().greater(Joi.ref("checkIn")),
    guests: Joi.number().required(),
    totalAmount: Joi.number().required(),
    status: Joi.string()
      .valid("pending", "confirmed", "canceled")
      .default("confirmed"),
  }).required(),
});
