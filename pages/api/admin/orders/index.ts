// pages/api/admin/orders/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Prisma } from '@prisma/client'; // Добавляем Prisma для типизации whereClause

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { search } = req.query; 
  
  // ИСПРАВЛЕНО: Изменено с 'let' на 'const', так как whereClause не переназначается
  const whereClause: Prisma.OrderWhereInput = {}; 

  if (search && typeof search === 'string') {
    const cleanSearch = search.startsWith('#') ? search.substring(1) : search;

    whereClause.OR = [
      { id: { contains: cleanSearch, mode: 'insensitive' } }, 
      { deliveryFullName: { contains: cleanSearch, mode: 'insensitive' } },
      { deliveryPhoneNumber: { contains: cleanSearch, mode: 'insensitive' } },
      { user: { username: { contains: cleanSearch, mode: 'insensitive' } } },
      { user: { firstName: { contains: cleanSearch, mode: 'insensitive' } } },
      { user: { lastName: { contains: cleanSearch, mode: 'insensitive' } } },
    ];
  }

  try {
    const orders = await prisma.order.findMany({
      where: whereClause, 
      include: {
        user: { 
          select: {
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Ошибка при получении заказов для админ-панели:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении заказов' });
  }
}