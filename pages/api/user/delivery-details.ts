// pages/api/user/delivery-details.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // В реальном приложении ID пользователя нужно получать из сессии
  const userId = '2138182633'; // Используем наш тестовый ID

  try {
    const deliveryDetails = await prisma.deliveryDetail.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // Сначала новые
    });
    res.status(200).json(deliveryDetails);
  } catch (error) {
    console.error('Ошибка при получении адресов доставки:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}