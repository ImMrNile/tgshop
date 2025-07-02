// pages/api/admin/orders/[id]/comments.ts (пример)
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { notifyNewManagerMessage } from '../../../../lib/telegram-notifier'; // Импортируем нотификатор
import { Role } from '@prisma/client'; // Импортируем роль

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query; // ID заказа
  const { text, imageUrls, authorRole } = req.body; // Текст сообщения, изображения

  // ... (Проверка авторизации админа) ...

  try {
    const newComment = await prisma.comment.create({
      data: {
        orderId: String(id),
        text: text,
        imageUrls: imageUrls || [],
        authorRole: authorRole, // Убедитесь, что это ADMIN
      }
    });

    // Отправляем уведомление пользователю, если это сообщение от админа
    if (authorRole === Role.ADMIN) {
        await notifyNewManagerMessage(String(id), text);
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Failed to add comment.' });
  }
}