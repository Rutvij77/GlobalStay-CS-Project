const Review = require("../models/review.js");
const Listing = require("../models/listing.js");

// Add a new review
module.exports.addReview = async (req, res) => {
  try {
    // 1. Fetch Listing
    const listingObj = await Listing.findById(req.params.id);
    if (!listingObj) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
    const listing = listingObj.data; // Unwrap

    // 2. Create and Save Review
    const newReview = new Review(req.body.review);
    newReview.data.author = req.user._id; // Set author ID string
    await newReview.save(); // This generates the _id

    // 3. Add Review ID to Listing
    if (!listing.reviews) listing.reviews = [];
    listing.reviews.push(newReview.data._id);

    // 4. Recalculate Average Rating (Manual Calculation)
    // We must fetch the existing reviews to calculate the new average
    let totalRating = 0;
    let count = 0;

    // Optimization: Loop through IDs and fetch ratings
    // (In a real production app, you might store a running total to avoid this loop)
    for (let reviewId of listing.reviews) {
      let rObj = await Review.findById(reviewId);
      if (rObj) {
        totalRating += Number(rObj.data.rating);
        count++;
      }
    }

    listing.reviewCount = count;
    if (count > 0) {
      listing.avgRating = (totalRating / count).toFixed(1);
    } else {
      listing.avgRating = 0;
    }

    // 5. Save Listing
    await listingObj.save();

    req.flash("success", "Your review has been added!");
    return res.redirect(`/listings/${listing._id}`);
  } catch (err) {
    console.error("Add Review Error:", err);
    req.flash("error", "Could not add review.");
    return res.redirect(`/listings/${req.params.id}`);
  }
};

// Delete a review
module.exports.deleteReview = async (req, res) => {
  try {
    let { id, reviewId } = req.params;

    // 1. Fetch Listing
    let listingObj = await Listing.findById(id);
    if (!listingObj) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
    let listing = listingObj.data;

    // 2. Manual $pull: Remove the review ID from the array
    if (listing.reviews) {
      listing.reviews = listing.reviews.filter((rId) => rId !== reviewId);
    }

    // 3. Delete the actual Review Document
    await Review.deleteById(reviewId);

    // 4. Recalculate Average Rating (Manual Calculation)
    let totalRating = 0;
    let count = 0;

    for (let rId of listing.reviews) {
      let rObj = await Review.findById(rId);
      if (rObj) {
        totalRating += Number(rObj.data.rating);
        count++;
      }
    }

    listing.reviewCount = count;
    if (count > 0) {
      listing.avgRating = (totalRating / count).toFixed(1);
    } else {
      listing.avgRating = 0;
    }

    // 5. Save Listing
    await listingObj.save();

    req.flash("success", "The review has been deleted.");
    return res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error("Delete Review Error:", err);
    req.flash("error", "Could not delete review.");
    return res.redirect(`/listings/${req.params.id}`);
  }
};
