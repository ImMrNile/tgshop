// pages/api/user/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getUserFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userProfile = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!userProfile) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Ошибка при получении профиля пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}