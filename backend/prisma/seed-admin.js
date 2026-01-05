const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedAdmin() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@xavlink.com" },
  });

  if (existingAdmin) {
    console.log("✓ Admin already exists");
    return;
  }

  const hashed = await bcrypt.hash("admin123456", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@xavlink.com",
      password: hashed,
      role: "admin", // make sure this matches schema enum/casing
      bio: "System administrator",
      course: "Admin",
      year: 0,
    },
  });

  console.log("✓ Admin user created:", admin.email);
}

module.exports = seedAdmin;
