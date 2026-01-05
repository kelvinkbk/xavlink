const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      name: 'Alice Example',
      email: 'alice@example.com',
      password: hashed,
      course: 'Computer Science',
      year: 3,
      bio: 'Early contributor for XavLink.',
      profilePic: null,
      skills: {
        create: [
          {
            title: 'React Tutoring',
            description: '1:1 sessions for modern React and hooks.',
            category: 'Web Development',
            priceRange: '₹150/hr'
          }
        ]
      }
    }
  });

  const chat = await prisma.chat.create({
    data: {
      participants: {
        create: [{ userId: alice.id }]
      }
    }
  });

  await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: alice.id,
      text: 'Welcome to XavLink!',
    }
  });

  console.log('Seed completed with user id:', alice.id);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
