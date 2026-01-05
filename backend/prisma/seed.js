const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedAdmin() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@xavlink.com" },
  });

  if (!existingAdmin) {
    const hashed = await bcrypt.hash("admin123456", 10);
    await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@xavlink.com",
        password: hashed,
        role: "admin",
        bio: "System administrator",
        course: "Admin",
        year: 0,
      },
    });

    console.log("✓ Admin seeded");
  }
}

async function main() {
  await seedAdmin();

  // optional demo user
  const hashed = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice Example",
      email: "alice@example.com",
      password: hashed,
      course: "Computer Science",
      year: 3,
      bio: "Early contributor",
    },
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
