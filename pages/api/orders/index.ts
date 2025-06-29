// pages/api/orders/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // В реальном приложении ID пользователя нужно будет получать из сессии или аутентификации
  const userId = '2138182633'; // Используем наш тестовый ID пользователя

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