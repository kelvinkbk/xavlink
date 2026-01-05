const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authMiddleware);

// User reviews
router.post("/user", reviewController.createUserReview);
router.get("/user/:userId", reviewController.getUserReviews);
router.put("/user/:reviewId", reviewController.updateUserReview);
router.delete("/user/:reviewId", reviewController.deleteUserReview);

// Post reviews
router.post("/post", reviewController.createPostReview);
router.get("/post/:postId", reviewController.getPostReviews);
router.put("/post/:reviewId", reviewController.updatePostReview);
router.delete("/post/:reviewId", reviewController.deletePostReview);

// Get my reviews
router.get("/my/reviews", reviewController.getMyReviews);

module.exports = router;
