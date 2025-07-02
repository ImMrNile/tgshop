// pages/api/admin/orders/[id]/status.ts (пример)
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { notifyOrderStatusChange } from '../../../../lib/telegram-notifier'; // Импортируем нотификатор

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query; // ID заказа
  const { status } = req.body; // Новый статус

  // ... (Проверка авторизации админа, валидация) ...

  try {
    const updatedOrder = await prisma.order.update({
      where: { id: String(id) },
      data: { status: status }, // Устанавливаем новый статус
      include: { user: true } // Включаем пользователя, чтобы получить telegramId
    });

    // Отправляем уведомление пользователю
    if (updatedOrder.user && updatedOrder.user.telegramId) {
      await notifyOrderStatusChange(updatedOrder.id, updatedOrder.status);
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status.' });
  }
}