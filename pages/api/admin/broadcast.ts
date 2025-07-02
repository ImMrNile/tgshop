// pages/api/admin/broadcast.ts (пример)
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { notifyGeneralUpdate } from '../../../lib/telegram-notifier'; // Импортируем нотификатор

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { messageText, targetUserId } = req.body; // messageText для сообщения, targetUserId (опционально) для конкретного пользователя

  // ... (Проверка авторизации админа) ...

  try {
    if (targetUserId) {
      // Отправить конкретному пользователю
      await notifyGeneralUpdate(targetUserId, messageText);
    } else {
      // Отправить всем пользователям (осторожно с количеством!)
      const users = await prisma.user.findMany({
        select: { id: true } // Выбираем только ID
      });
      for (const user of users) {
        await notifyGeneralUpdate(user.id, messageText);
      }
    }

    res.status(200).json({ message: 'Уведомление отправлено.' });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ message: 'Failed to send broadcast.' });
  }
}