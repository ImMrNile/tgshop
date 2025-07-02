// pages/api/user/delivery-details/[id].ts - API для удаления адреса доставки
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== DELIVERY DETAILS [ID] API DEBUG ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('======================================');

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid delivery detail ID' });
  }

  if (req.method === 'DELETE') {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'Пользователь не авторизован.' });
      }

      console.log('Attempting to delete delivery detail:', id, 'for user:', userId);

      // Проверяем, что адрес принадлежит пользователю
      const deliveryDetail = await prisma.deliveryDetail.findFirst({
        where: {
          id: id,
          userId: userId
        }
      });

      if (!deliveryDetail) {
        console.log('Delivery detail not found or does not belong to user');
        return res.status(404).json({ message: 'Адрес доставки не найден или не принадлежит пользователю.' });
      }

      // Удаляем адрес
      await prisma.deliveryDetail.delete({
        where: { id: id }
      });

      console.log('Delivery detail deleted successfully');
      res.status(200).json({ message: 'Адрес доставки успешно удален.' });

    } catch (error: unknown) {
      console.error('Failed to delete delivery detail:', error);
      const message = error instanceof Error ? error.message : 'Ошибка при удалении адреса доставки.';
      res.status(500).json({ message });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}