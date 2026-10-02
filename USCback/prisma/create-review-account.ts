/**
 * Crea (o actualiza) la cuenta de demostración para la revisión de App Store
 * y Google Play. Es seguro correrlo en producción: no borra nada.
 *
 *   REVIEW_ACCOUNT_PASSWORD='...' npm run review:account
 *
 * La cuenta queda con `emailVerifiedAt` puesto, así que el login NO pide el
 * código por correo (el revisor no tiene acceso a ese buzón). Además crea dos
 * compañeros de demo con match y un chat, para que el revisor vea todas las
 * funciones sin depender de otros usuarios.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const REVIEW_EMAIL = process.env.REVIEW_ACCOUNT_EMAIL || 'revision.app@usc.edu.co';
const DEMO_FRIENDS = [
  { email: 'demo.laura@usc.edu.co', name: 'Laura Gómez', nickname: 'lau', major: 'Psicología' },
  { email: 'demo.andres@usc.edu.co', name: 'Andrés Rojas', nickname: 'andre', major: 'Ingeniería de Sistemas' },
];

async function upsertUser(data: { email: string; name: string; nickname: string; major: string }, password: string) {
  return prisma.user.upsert({
    where: { email: data.email },
    update: { password, emailVerifiedAt: new Date(), deletedAt: null, accountStatus: 'ACTIVE' },
    create: { ...data, password, emailVerifiedAt: new Date() },
  });
}

async function main() {
  const plain = process.env.REVIEW_ACCOUNT_PASSWORD;
  if (!plain || plain.length < 8) {
    throw new Error('Define REVIEW_ACCOUNT_PASSWORD (mínimo 8 caracteres).');
  }
  const password = await bcrypt.hash(plain, 10);
  // Los compañeros de demo no inician sesión: contraseña aleatoria.
  const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10);

  const reviewer = await upsertUser(
    { email: REVIEW_EMAIL, name: 'Revisión App', nickname: 'revision', major: 'Comunicación Social' },
    password,
  );

  for (const [i, friendData] of DEMO_FRIENDS.entries()) {
    const friend = await upsertUser(friendData, randomPassword);
    const [userAId, userBId] = reviewer.id < friend.id ? [reviewer.id, friend.id] : [friend.id, reviewer.id];

    for (const [senderId, receiverId] of [
      [reviewer.id, friend.id],
      [friend.id, reviewer.id],
    ]) {
      await prisma.like.upsert({
        where: { senderId_receiverId: { senderId, receiverId } },
        update: {},
        create: { senderId, receiverId },
      });
    }
    await prisma.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      update: {},
      create: { userAId, userBId },
    });

    const hasMessages = await prisma.message.count({
      where: { senderId: friend.id, receiverId: reviewer.id },
    });
    if (!hasMessages) {
      await prisma.message.create({
        data: {
          senderId: friend.id,
          receiverId: reviewer.id,
          content: i === 0 ? '¡Hola! ¿Vas a ir al evento de bienvenida?' : '¿Tienes los apuntes de la clase de hoy?',
        },
      });
    }
  }

  // Recalcula likesCount con los likes reales, para que el ranking cuadre.
  for (const u of [reviewer.email, ...DEMO_FRIENDS.map((f) => f.email)]) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: u } });
    const likes = await prisma.like.count({ where: { receiverId: user.id } });
    await prisma.user.update({ where: { id: user.id }, data: { likesCount: likes } });
  }

  console.log(`✅ Cuenta de revisión lista: ${REVIEW_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
