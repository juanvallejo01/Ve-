import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // El seed BORRA toda la base antes de sembrar: nunca en producción.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('prisma/seed.ts borra todos los datos; no se ejecuta con NODE_ENV=production.');
  }
  console.log('🌱 Starting database seed...');

  // Clean existing data (hijos primero para no violar llaves foráneas)
  await prisma.comment.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.post.deleteMany();
  await prisma.report.deleteMany();
  await prisma.block.deleteMany();
  await prisma.twoFactorCode.deleteMany();
  await prisma.passwordResetCode.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.like.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash('AdminUSC2026!', 10);
  const userPassword = await bcrypt.hash('UserUSC2026!', 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      name: 'USC Administrator',
      email: 'superadmin@usc.edu',
      password: adminPassword,
      major: 'Administration',
      role: UserRole.ADMIN,
    },
  });
  console.log('✅ Created admin user');

  // Create regular users
  const majors = [
    'Computer Science',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Business Administration',
    'Psychology',
    'Biology',
    'Mathematics',
    'Physics',
  ];

  const users = [];
  for (let i = 1; i <= 20; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Student ${i}`,
        email: `student${i}@usc.edu`,
        password: userPassword,
        major: majors[i % majors.length],
      },
    });
    users.push(user);
  }
  console.log('✅ Created 20 regular users');

  // Create some likes and matches
  const likePairs = [
    [0, 1],
    [1, 0], // mutual
    [2, 3],
    [3, 2], // mutual
    [4, 5],
    [5, 4], // mutual
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [6, 7],
    [7, 6], // mutual
  ];

  for (const [senderIdx, receiverIdx] of likePairs) {
    const senderId = users[senderIdx].id;
    const receiverId = users[receiverIdx].id;

    // Create like
    await prisma.like.create({
      data: {
        senderId,
        receiverId,
      },
    });

    // Increment receiver's likes count
    await prisma.user.update({
      where: { id: receiverId },
      data: { likesCount: { increment: 1 } },
    });

    // Check for match
    const reverseLike = await prisma.like.findUnique({
      where: {
        senderId_receiverId: {
          senderId: receiverId,
          receiverId: senderId,
        },
      },
    });

    if (reverseLike) {
      const [userAId, userBId] =
        senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

      const existingMatch = await prisma.match.findUnique({
        where: {
          userAId_userBId: {
            userAId,
            userBId,
          },
        },
      });

      if (!existingMatch) {
        const match = await prisma.match.create({
          data: {
            userAId,
            userBId,
          },
        });

        // Create notifications
        await prisma.notification.createMany({
          data: [
            {
              userId: senderId,
              type: 'MATCH',
              referenceId: match.id,
            },
            {
              userId: receiverId,
              type: 'MATCH',
              referenceId: match.id,
            },
          ],
        });
      }
    }
  }
  console.log('✅ Created likes and matches');

  // Create some messages for matched users
  const matches = await prisma.match.findMany();
  for (const match of matches.slice(0, 3)) {
    await prisma.message.createMany({
      data: [
        {
          senderId: match.userAId,
          receiverId: match.userBId,
          content: 'Hey! Great to match with you!',
        },
        {
          senderId: match.userBId,
          receiverId: match.userAId,
          content: 'Thanks! Same here!',
        },
        {
          senderId: match.userAId,
          receiverId: match.userBId,
          content: 'What major are you?',
        },
      ],
    });
  }
  console.log('✅ Created sample messages');

  // Print summary
  const stats = {
    users: await prisma.user.count(),
    likes: await prisma.like.count(),
    matches: await prisma.match.count(),
    messages: await prisma.message.count(),
    notifications: await prisma.notification.count(),
  };

  console.log('\n📊 Database seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Users: ${stats.users} (1 admin, ${stats.users - 1} regular)`);
  console.log(`Likes: ${stats.likes}`);
  console.log(`Matches: ${stats.matches}`);
  console.log(`Messages: ${stats.messages}`);
  console.log(`Notifications: ${stats.notifications}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📝 Test Credentials:');
  console.log('Admin: superadmin@usc.edu / AdminUSC2026!');
  console.log('Users: student1@usc.edu - student20@usc.edu / UserUSC2026!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
