// pages/api/orders/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getUserFromRequest } from '../../../lib/auth'; // Импортируем getUserFromRequest

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Получаем userId из аутентифицированного пользователя
  const user = await getUserFromRequest(req);
  if (!user) {
    console.error('API /orders: Unauthorized attempt. No valid user found from token.');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userId = user.id;

  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    // Этот эндпоинт всегда должен возвращать успешный ответ (200),
    // даже если заказов нет (вернется пустой массив).
    res.status(200).json(orders);
  } catch (error) {
    console.error('Ошибка при получении заказов пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении заказов' });
  }
}