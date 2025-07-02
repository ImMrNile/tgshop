import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

// Определяем интерфейс для полезной нагрузки JWT
interface JwtPayload {
  userId: string; // Предполагаем, что userId является строкой
  // Добавьте другие поля, если они присутствуют в вашем токене
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    // ИСПРАВЛЕНИЕ: Приводим тип к JwtPayload
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload; 
    const userId = decoded.userId;

    // Получаем пользователя с рефералами
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referredUsers: {
          include: {
            orders: {
              where: { status: 'DELIVERED' }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Получаем заказы пользователя
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Подсчитываем статистику
    const completedOrders = orders.filter(order => order.status === 'DELIVERED');
    const totalSpent = completedOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalSpent / completedOrders.length : 0;

    // Статистика по рефералам
    const referralsCount = user.referredUsers.length;
    const referralEarnings = Number(user.availableBalance);

    // VIP статус (пример логики)
    let vipLevel = 'Новичок';
    let nextThreshold: number | null = 10000; // ИСПРАВЛЕНИЕ: Явно указываем `| null`
    let progress = 0;

    if (totalSpent >= 50000) {
      vipLevel = 'Платиновый';
      nextThreshold = null; 
      progress = 100;
    } else if (totalSpent >= 25000) {
      vipLevel = 'Золотой';
      nextThreshold = 50000;
      progress = (totalSpent / 50000) * 100;
    } else if (totalSpent >= 10000) {
      vipLevel = 'Серебряный';
      nextThreshold = 25000;
      progress = (totalSpent / 25000) * 100;
    } else {
      vipLevel = 'Новичок';
      nextThreshold = 10000;
      progress = (totalSpent / 10000) * 100;
    }

    // Последние заказы
    const recentOrders = completedOrders.slice(0, 5).map(order => ({
      id: order.id,
      total: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      itemsCount: order.items.length
    }));

    // Детали рефералов
    const referralDetails = user.referredUsers.map(referral => ({
      name: `${referral.firstName || ''} ${referral.lastName || ''}`.trim() || referral.username || 'Пользователь',
      joinedAt: referral.createdAt.toISOString(),
      ordersCount: referral.orders.length,
      totalSpent: referral.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    }));

    const stats = {
      totalSpent,
      completedOrdersCount: completedOrders.length,
      referralEarnings,
      averageOrderValue,
      referralsCount,
      vipStatus: {
        level: vipLevel,
        nextThreshold,
        progress
      },
      recentOrders,
      referralDetails
    };

    res.status(200).json(stats);

  } catch (error: unknown) { // ИСПРАВЛЕНИЕ: Явно указываем тип 'unknown' для ошибки
    console.error('Error fetching user stats:', error);
    // ИСПРАВЛЕНИЕ: Корректная обработка ошибки с проверкой типа
    res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
  }
}