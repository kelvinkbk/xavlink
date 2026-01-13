/**
 * Scheduled Posts Job Handler
 * This utility handles publishing scheduled posts when their scheduled time arrives.
 * Should be run as a background job or cron task.
 */

const { PrismaClient } = require("@prisma/client");
const postController = require("../controllers/postController");

const prisma = new PrismaClient();

/**
 * Publish all scheduled posts that have reached their scheduled time
 */
async function publishScheduledPosts() {
  try {
    const now = new Date();
    console.log(
      `[Scheduler] Checking for scheduled posts (Current time: ${now.toISOString()})...`
    );

    // Find all scheduled posts that are ready to publish
    const postsToPublish = await prisma.post.findMany({
      where: {
        isScheduled: true,
        scheduledAt: {
          lte: now, // Posts scheduled at or before now
        },
      },
      include: {
        user: true,
      },
    });

    if (postsToPublish.length === 0) {
      // Check if there are ANY scheduled posts to debug
      const allScheduled = await prisma.post.findMany({
        where: { isScheduled: true },
        select: { id: true, scheduledAt: true, content: true },
      });
      if (allScheduled.length > 0) {
        console.log(
          `[Scheduler] ${allScheduled.length} scheduled posts waiting:`,
          allScheduled.map((p) => ({
            id: p.id,
            scheduledAt: p.scheduledAt?.toISOString(),
            willPublishIn: p.scheduledAt
              ? Math.round((p.scheduledAt - now) / 1000) + "s"
              : "N/A",
          }))
        );
      }
      return { published: 0, failed: 0 };
    }

    console.log(`[Scheduler] Found ${postsToPublish.length} posts to publish`);

    let published = 0;
    let failed = 0;

    for (const post of postsToPublish) {
      try {
        // Update post to mark it as published (not scheduled)
        await prisma.post.update({
          where: { id: post.id },
          data: {
            isScheduled: false,
            scheduledAt: null,
          },
        });

        // Log activity for post creation
        await prisma.activity.create({
          data: {
            userId: post.userId,
            type: "post_created",
            description: "Your scheduled post was published",
            postId: post.id,
          },
        });

        console.log(`[Scheduler] Published post ${post.id}`);
        published++;
      } catch (error) {
        console.error(`[Scheduler] Failed to publish post ${post.id}:`, error);
        failed++;
      }
    }

    console.log(
      `[Scheduler] Completed: ${published} published, ${failed} failed`
    );
    return { published, failed };
  } catch (error) {
    console.error("[Scheduler] Error in publishScheduledPosts:", error);
    throw error;
  }
}

/**
 * Start the scheduled posts publisher as a background job
 * Should be called once when the server starts
 */
function startScheduledPostsPublisher(intervalMs = 10000) {
  // Run every 10 seconds by default
  console.log(
    `[Scheduler] Starting scheduled posts publisher (interval: ${intervalMs}ms)`
  );

  // Run immediately on startup
  publishScheduledPosts()
    .then((result) => {
      console.log(`[Scheduler] Initial run: ${result.published} published`);
    })
    .catch((err) => {
      console.error("[Scheduler] Initial run error:", err.message);
    });

  // Then run at regular intervals
  const intervalId = setInterval(() => {
    publishScheduledPosts()
      .then((result) => {
        if (result.published > 0 || result.failed > 0) {
          console.log(
            `[Scheduler] Published: ${result.published}, Failed: ${result.failed}`
          );
        }
      })
      .catch((err) => {
        console.error("[Scheduler] Error:", err.message);
      });
  }, intervalMs);

  // Prevent the interval from keeping the process alive
  intervalId.unref?.();

  return intervalId;
}

module.exports = {
  publishScheduledPosts,
  startScheduledPostsPublisher,
};
