// pages/api/admin/users/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import type { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end();
  }

  const { search } = req.query;
  let where: Prisma.UserWhereInput = {};

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
    const users = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: { referredUsers: true }, // Считаем количество приглашенных
        },
        referralPayouts: {
          select: { amount: true }, // Получаем все выплаты
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Добавляем к каждому пользователю сумму его реферальных выплат
    const usersWithPayouts = users.map(user => {
        const totalPayouts = user.referralPayouts.reduce((sum, payout) => {
            return sum + parseFloat(payout.amount.toString());
        }, 0);
        // Удаляем исходный массив, чтобы не передавать лишние данные
        const { referralPayouts, ...userWithoutPayouts } = user;
        return { ...userWithoutPayouts, totalPayouts };
    });

    res.status(200).json(usersWithPayouts);
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}