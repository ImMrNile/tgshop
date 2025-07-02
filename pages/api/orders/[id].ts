// pages/api/orders/[id].ts - НОВЫЙ ФАЙЛ ДЛЯ ПОЛЬЗОВАТЕЛЬСКИХ ЗАКАЗОВ
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getUserFromRequest } from '../../../lib/auth'; // Для аутентификации

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id: orderId } = req.query;

  if (typeof orderId !== 'string') {
    return res.status(400).json({ message: 'Invalid order ID' });
  }

  // Аутентификация пользователя
  const user = await getUserFromRequest(req);
  if (!user) {
    console.error(`API /orders/${orderId}: Unauthorized attempt. No valid user found from token.`);
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { images: true } },
            productVariant: { select: { color: true, size: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' }, // Комментарии в хронологическом порядке
        },
      },
    });

    if (!order) {
      console.warn(`API /orders/${orderId}: Order not found for ID ${orderId}.`);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Проверка, что заказ принадлежит текущему авторизованному пользователю
    if (order.userId !== user.id) {
      console.warn(`API /orders/${orderId}: Forbidden access attempt. User ${user.id} tried to access order ${orderId} belonging to ${order.userId}.`);
      return res.status(403).json({ message: 'Forbidden: You do not own this order.' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error(`API /orders/${orderId}: Failed to fetch order:`, error);
    res.status(500).json({ message: 'Failed to fetch order', error: (error as Error).message });
  }
}