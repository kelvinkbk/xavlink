const prisma = require("../config/prismaClient");
const { notifyPostLike, notifyPostComment } = require("./notificationService");

class PostService {
  /**
   * Create a new post.
   */
  static async createPost({ content, image, userId }) {
    let post;
    try {
      post = await prisma.post.create({
        data: {
          content,
          image: image || null,
          userId,
        },
        include: {
          user: {
            select: { id: true, name: true, profilePic: true, course: true },
          },
        },
      });
    } catch (err) {
      // If image column doesn't exist, create without it
      if (
        err.code === "P2010" ||
        err.message.includes("image") ||
        err.message.includes("Image") ||
        err.message.includes("does not exist")
      ) {
        console.log("⚠️ Image column not found, creating post without image");
        post = await prisma.post.create({
          data: {
            content,
            userId,
          },
          include: {
            user: {
              select: { id: true, name: true, profilePic: true, course: true },
            },
          },
        });
      } else {
        throw err;
      }
    }
    return post;
  }

  /**
   * Get all primary feed posts.
   */
  static async getAllPosts(userId = null) {
    const posts = await prisma.post.findMany({
      where: {
        isScheduled: { not: true },
      },
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, course: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        try {
          const [likesCount, commentsCount, existingLike] = await Promise.all([
            prisma.like.count({ where: { postId: post.id } }),
            prisma.comment.count({ where: { postId: post.id } }),
            userId
              ? prisma.like.findUnique({
                  where: { postId_userId: { userId, postId: post.id } },
                })
              : null,
          ]);

          return {
            ...post,
            likesCount: likesCount || 0,
            commentsCount: commentsCount || 0,
            isLiked: !!existingLike,
            isBookmarked: false,
          };
        } catch (err) {
          console.error(`Error enriching post ${post.id}:`, err.message);
          return {
            ...post,
            likesCount: 0,
            commentsCount: 0,
            isLiked: false,
            isBookmarked: false,
          };
        }
      }),
    );

    return {
      posts: postsWithCounts,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: posts?.length || 0,
        hasMore: false,
      },
    };
  }
}

module.exports = PostService;
