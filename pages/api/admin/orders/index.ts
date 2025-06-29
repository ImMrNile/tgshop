// pages/api/admin/orders/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import type { Prisma } from '@prisma/client'; // Импортируем типы Prisma

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { search } = req.query;

  try {
    // Явно указываем тип для объекта 'where'
    let where: Prisma.OrderWhereInput = {};

    if (search && typeof search === 'string') {
      where = {
        OR: [
          // Поиск по ID мы делаем без 'insensitive', так как это уникальный идентификатор
          { id: { contains: search } },
          // Поиск по ФИО и телефону оставляем без учета регистра
          { deliveryFullName: { contains: search, mode: 'insensitive' } },
          { deliveryPhoneNumber: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orders = await prisma.order.findMany({
      where, // Используем наш типизированный объект
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { firstName: true, lastName: true, username: true },
        },
      },
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Ошибка при получении заказов для админа:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}