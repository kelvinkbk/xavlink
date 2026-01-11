const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function clearOldProfilePics() {
  try {
    // Update all users with old /uploads/ URLs to null
    const result = await prisma.user.updateMany({
      where: {
        profilePic: {
          contains: "/uploads/",
        },
      },
      data: {
        profilePic: null,
      },
    });

    console.log(`✅ Cleared ${result.count} old profile pictures`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error clearing old profile pictures:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearOldProfilePics();
