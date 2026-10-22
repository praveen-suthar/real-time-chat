import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.message.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create users
  const praveen = await prisma.user.create({
    data: {
      username: 'praveen',
      email: 'praveen.suthar@example.com',
      password: passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    },
  });

  const priya = await prisma.user.create({
    data: {
      username: 'priya',
      email: 'priya.patel@example.com',
      password: passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  const rohit = await prisma.user.create({
    data: {
      username: 'rohit',
      email: 'rohit.suthar@example.com',
      password: passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  });

  const sneha = await prisma.user.create({
    data: {
      username: 'sneha',
      email: 'sneha.suthar@example.com',
      password: passwordHash,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    },
  });

  const convPraveenPriya = await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: praveen.id },
          { userId: priya.id },
        ],
      },
      messages: {
        create: [
          {
            senderId: praveen.id,
            content: 'Namaste Priya! Are we still reviewing the release today?',
            clientId: 'seed-msg-1',
          },
          {
            senderId: priya.id,
            content: 'Yes Praveen! Just wrapping up testing, everything looks good.',
            clientId: 'seed-msg-2',
          },
        ],
      },
    },
  });

  await prisma.conversation.create({
    data: {
      participants: {
        create: [
          { userId: praveen.id },
          { userId: rohit.id },
        ],
      },
      messages: {
        create: [
          {
            senderId: rohit.id,
            content: 'Bhai, did you push the latest changes to staging?',
            clientId: 'seed-msg-3',
          },
          {
            senderId: praveen.id,
            content: 'Yes Rohit, pipeline passed successfully.',
            clientId: 'seed-msg-4',
          },
        ],
      },
    },
  });

  console.log(`Seeded users: ${praveen.username}, ${priya.username}, ${rohit.username}, ${sneha.username}`);
  console.log(`Seeded primary conversation: ${convPraveenPriya.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
