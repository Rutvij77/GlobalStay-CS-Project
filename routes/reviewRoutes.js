const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require("../utils/wrapAsync.js");
const {
  isLoggedIn,
  validateReview,
  isReviewAuthor,
} = require("../middleware.js");
const reviewController = require("../controllers/reviewController.js");

// Create a new review
router.post(
  "/",
  isLoggedIn,
  validateReview,
  wrapAsync(reviewController.addReview)
);

// Delete a review
router.delete(
  "/:reviewId/delete",
  isLoggedIn,
  isReviewAuthor,
  wrapAsync(reviewController.deleteReview)
);

module.exports = router;
