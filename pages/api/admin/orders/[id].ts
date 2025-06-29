// pages/api/admin/orders/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { OrderStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'Некорректный ID заказа.' });
  }

  // --- ОБНОВЛЕННЫЙ И ОПТИМИЗИРОВАННЫЙ GET-ЗАПРОС ---
  if (req.method === 'GET') {
    try {
      const order = await prisma.order.findUnique({
        where: { id },
        // Используем `select` вместо `include`, чтобы запросить только нужные поля
        select: {
          id: true,
          createdAt: true,
          status: true,
          deliveryType: true,
          deliveryFullName: true,
          deliveryPhoneNumber: true,
          deliveryCountry: true,
          deliveryCity: true,
          deliveryAddress: true,
          deliveryPostalCode: true,
          totalAmount: true,
          trackingNumber: true,
          deliveryCostPaidByAdmin: true,
          user: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantity: true,
              productPrice: true,
              product: {
                select: {
                  images: true,
                },
              },
              productVariant: {
                select: {
                  color: true,
                  size: true,
                },
              },
            },
          },
          comments: {
            select: {
              id: true,
              text: true,
              imageUrls: true,
              createdAt: true,
              authorRole: true
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({ message: 'Заказ не найден.' });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error(`Ошибка при получении заказа ${id}:`, error);
      res.status(500).json({ message: 'Внутренняя ошибка сервера при получении заказа.' });
    }
  } 
  // --- Обработчик PUT-запроса остается без изменений ---
  else if (req.method === 'PUT') {
    try {
      const { status, trackingNumber, deliveryCostPaidByAdmin } = req.body;
      if (!status || !Object.values(OrderStatus).includes(status)) {
        return res.status(400).json({ message: 'Некорректный статус заказа.' });
      }
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status,
          trackingNumber: trackingNumber || null,
          deliveryCostPaidByAdmin: deliveryCostPaidByAdmin ? parseFloat(deliveryCostPaidByAdmin) : null,
        },
      });
      res.status(200).json(updatedOrder);
    } catch (error) {
      console.error(`Ошибка при обновлении заказа ${id}:`, error);
      res.status(500).json({ message: 'Внутренняя ошибка сервера при обновлении заказа.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}