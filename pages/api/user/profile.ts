// pages/api/user/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  // В реальном приложении ID пользователя нужно будет получать из сессии или аутентификации
  const userId = '2138182633'; // ID нашего тестового пользователя

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        // Подсчитываем количество заказов для этого пользователя
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Ошибка при получении профиля пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}