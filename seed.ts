// seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '2138182633';

  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!existingUser) {
    console.log(`Создаем тестового пользователя с ID: ${userId}...`);
    await prisma.user.create({
      data: {
        id: userId,
        // --- ИСПРАВЛЕНО: ID теперь передается как строка ---
        telegramId: '2138182633',
        firstName: 'Тестовый',
        lastName: 'Пользователь',
        username: 'testuser',
        // Добавьте другие обязательные поля, если они есть в вашей модели User
      },
    });
    console.log('Тестовый пользователь успешно создан.');
  } else {
    console.log('Тестовый пользователь уже существует.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });