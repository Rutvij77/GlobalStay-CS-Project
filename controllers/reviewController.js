const Review = require("../models/review.js");
const Listing = require("../models/listing.js");

// Add a new review to a listing, update its average rating and review count
module.exports.addReview = async (req, res) => {
  let listing = await Listing.findById(req.params.id);
  let newReview = new Review(req.body.review);
  newReview.author = req.user._id;

  listing.reviews.push(newReview._id);

  await newReview.save();
  await listing.save();

  const updatedListing = await Listing.findById(req.params.id).populate(
    "reviews"
  );

  const reviewCount = listing.reviews.length;
  if (reviewCount > 0) {
    const totalRating = updatedListing.reviews.reduce(
      (sum, r) => sum + r.rating,
      0
    );
    updatedListing.avgRating = (totalRating / reviewCount).toFixed(1);
  } else {
    updatedListing.avgRating = 0;
  }
  updatedListing.reviewCount = reviewCount;

  await updatedListing.save();

  req.flash("success", "Your review has been added!");
  return res.redirect(`/listings/${listing._id}`);
};

// Delete a review from a listing, update its average rating and review count
module.exports.deleteReview = async (req, res) => {
  let { id, reviewId } = req.params;
  let listing = await Listing.findByIdAndUpdate(
    id,
    { $pull: { reviews: reviewId } },
    { new: true }
  ).populate("reviews");

  await Review.findByIdAndDelete(reviewId);

  listing.reviewCount = listing.reviews.length;

  if (listing.reviewCount > 0) {
    listing.avgRating = parseFloat(
      (
        listing.reviews.reduce((sum, r) => sum + r.rating, 0) /
        listing.reviewCount
      ).toFixed(1)
    );
  } else {
    listing.avgRating = 0;
  }

  await listing.save();

  req.flash("success", "The review has been deleted.");
  return res.redirect(`/listings/${id}`);
};
