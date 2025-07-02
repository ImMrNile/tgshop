// pages/api/admin/users/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import type { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Принимаем только GET запросы
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const { search } = req.query;
  let where: Prisma.UserWhereInput = {};

  // Если есть поисковый запрос, формируем условие для Prisma
  if (search && typeof search === 'string') {
    where = {
      OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { telegramId: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  try {
    // Получаем пользователей из базы данных
    const users = await prisma.user.findMany({
      where,
      include: {
        // Подсчитываем количество связанных рефералов
        _count: {
          select: { referredUsers: true },
        },
        // Включаем связанные выплаты для подсчета суммы
        referralPayouts: {
          select: { amount: true },
        },
      },
      orderBy: { createdAt: 'desc' }, // Сортируем по дате создания
    });
    
    // Преобразуем данные для ответа клиенту
    const usersWithPayouts = users.map(user => {
        // Считаем общую сумму выплат для каждого пользователя
        const totalPayouts = user.referralPayouts.reduce((sum, payout) => {
            return sum + parseFloat(payout.amount.toString());
        }, 0);

        // --- РЕШЕНИЕ ПРОБЛЕМЫ ЗДЕСЬ ---
        // Добавляем комментарий, чтобы ESLint проигнорировал следующую строку.
        // Это говорит сборщику, что мы намеренно используем деструктуризацию для удаления свойства.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { referralPayouts, ...userWithoutPayouts } = user;
        
        // Возвращаем объект пользователя с посчитанной суммой выплат
        return { ...userWithoutPayouts, totalPayouts };
    });

    res.status(200).json(usersWithPayouts);
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}