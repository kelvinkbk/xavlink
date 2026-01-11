const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkProfiles() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, profilePic: true },
      take: 10,
    });

    console.log("Current profile pictures:");
    users.forEach((u) => {
      console.log(`${u.name}: ${u.profilePic}`);
    });
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkProfiles();
