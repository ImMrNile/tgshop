// pages/api/orders/[id]/comments.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Role } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // В будущем здесь нужно будет получать ID пользователя из сессии
  // и проверять, что он является владельцем этого заказа.
  // const userId = getUserIdFromSession(req);

  const { id: orderId } = req.query;
  const { text } = req.body;

  if (typeof orderId !== 'string' || !text || text.trim() === '') {
    return res.status(400).json({ message: 'Отсутствует ID заказа или текст комментария.' });
  }

  try {
    const comment = await prisma.comment.create({
      data: {
        text,
        orderId,
        authorRole: Role.USER, // <-- Указываем, что автор - Пользователь
      },
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error(`Ошибка при добавлении комментария от пользователя к заказу ${orderId}:`, error);
    res.status(500).json({ message: 'Не удалось добавить комментарий' });
  }
}