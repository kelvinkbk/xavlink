const prisma = require("../config/prismaClient");

// Create a user-to-user review
exports.createUserReview = async (req, res) => {
  try {
    const { userId, rating, comment } = req.body;
    const authorId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    if (authorId === userId) {
      return res.status(400).json({ error: "Cannot review yourself" });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create or update review
    const review = await prisma.review.upsert({
      where: { authorId_userId: { authorId, userId } },
      update: { rating, comment },
      create: { authorId, userId, rating, comment },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
};

// Create a post review
exports.createPostReview = async (req, res) => {
  try {
    const { postId, rating, comment } = req.body;
    const authorId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Cannot review your own post
    if (post.userId === authorId) {
      return res.status(400).json({ error: "Cannot review your own post" });
    }

    // Create or update review
    const review = await prisma.postReview.upsert({
      where: { authorId_postId: { authorId, postId } },
      update: { rating, comment },
      create: { authorId, postId, rating, comment },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating post review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
};

// Get reviews for a user
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { userId },
      include: {
        author: {
          select: { id: true, name: true, profilePic: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          ).toFixed(2)
        : 0;

    res.json({ reviews, avgRating, count: reviews.length });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// Get reviews for a post
exports.getPostReviews = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!postId) {
      return res.status(400).json({ error: "postId is required" });
    }

    const targetPost = await prisma.post.findUnique({ where: { id: postId } });
    if (!targetPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    const reviews = await prisma.postReview.findMany({
      where: { postId },
      include: {
        author: {
          select: { id: true, name: true, profilePic: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          ).toFixed(2)
        : 0;

    res.json({ reviews, avgRating, count: reviews.length });
  } catch (error) {
    console.error("Error fetching post reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// Get reviews given by current user
exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const userReviews = await prisma.review.findMany({
      where: { authorId: userId },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const postReviews = await prisma.postReview.findMany({
      where: { authorId: userId },
      include: {
        post: {
          select: { id: true, content: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ userReviews, postReviews });
  } catch (error) {
    console.error("Error fetching my reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

// Update a user review
exports.updateUserReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Check if review exists and belongs to user
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.authorId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating || review.rating,
        comment: comment !== undefined ? comment : review.comment,
      },
    });

    res.json(updatedReview);
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
};

// Update a post review
exports.updatePostReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Check if review exists and belongs to user
    const review = await prisma.postReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.authorId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updatedReview = await prisma.postReview.update({
      where: { id: reviewId },
      data: {
        rating: rating || review.rating,
        comment: comment !== undefined ? comment : review.comment,
      },
    });

    res.json(updatedReview);
  } catch (error) {
    console.error("Error updating post review:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
};

// Delete a user review
exports.deleteUserReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.authorId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
};

// Delete a post review
exports.deletePostReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await prisma.postReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.authorId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.postReview.delete({ where: { id: reviewId } });
    res.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
};
