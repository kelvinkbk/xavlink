const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@xavlink.com" },
  });

  if (existingAdmin) {
    console.log("Admin user already exists");
    return;
  }

  // Create admin user
  const hashed = await bcrypt.hash("admin123456", 10);
  const admin = await prisma.user.create({
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

  console.log("✓ Admin user created:", admin.email);
  console.log("  Email: admin@xavlink.com");
  console.log("  Password: admin123456");
  console.log("  (Change password after first login)");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
