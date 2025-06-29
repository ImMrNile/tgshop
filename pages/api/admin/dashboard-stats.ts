// pages/api/admin/dashboard-stats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { OrderStatus } from '@prisma/client';

const checkAdminAuth = (req: NextApiRequest): boolean => {
  return !!process.env.ADMIN_TELEGRAM_ID;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // --- Получаем все заказы, которые влияют на финансовые показатели ---
    const relevantOrders = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
        },
      },
      include: {
        items: true,
      },
    });

    // --- Считаем новые, более точные финансовые показатели ---
    let totalRevenue = 0;
    let totalCostOfGoods = 0;
    let totalDeliveryCosts = 0;
    
    for (const order of relevantOrders) {
      totalRevenue += parseFloat(order.totalAmount.toString());
      totalDeliveryCosts += parseFloat(order.deliveryCostPaidByAdmin?.toString() || '0');
      for (const item of order.items) {
        totalCostOfGoods += parseFloat(item.productCostPrice.toString()) * item.quantity;
      }
    }
    // Чистая прибыль = Выручка - Себестоимость товаров - Затраты на доставку
    const netProfit = totalRevenue - totalCostOfGoods - totalDeliveryCosts;

    // --- Ваша существующая логика для остальных виджетов ---
    const totalOrdersCount = await prisma.order.count();
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsersCount = await prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const statusCounts = ordersByStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // --- Отправляем объединенный результат ---
    res.status(200).json({
      totalOrders: totalOrdersCount,
      ordersByStatus: statusCounts,
      totalRevenue: totalRevenue,
      totalProfit: netProfit, // <-- Отправляем новую, рассчитанную прибыль
      newUsersLast30Days: newUsersCount,
      // Дополнительные данные для наглядности
      totalCostOfGoods,
      totalDeliveryCosts
    });

  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: (error instanceof Error) ? error.message : 'Unknown error' });
  }
}