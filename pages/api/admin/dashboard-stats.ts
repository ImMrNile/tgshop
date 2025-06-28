// pages/api/admin/dashboard-stats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Путь к глобальному экземпляру Prisma

// Вспомогательная функция для проверки авторизации админа
const checkAdminAuth = (req: NextApiRequest): boolean => {
  return !!process.env.ADMIN_TELEGRAM_ID;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // 1. Общее количество заказов
      const totalOrdersCount = await prisma.order.count();

      // 2. Количество заказов по статусам
      const ordersByStatus = await prisma.order.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      // 3. Общая сумма всех оплаченных заказов (Выручка)
      const totalRevenueResult = await prisma.order.aggregate({
        where: {
          status: 'PAID', // Или 'DELIVERED', в зависимости от того, что вы считаете выручкой
        },
        _sum: {
          totalAmount: true,
        },
      });
      const totalRevenue = totalRevenueResult._sum.totalAmount ? parseFloat(totalRevenueResult._sum.totalAmount.toString()) : 0;

      // 4. Общая прибыль
      const totalProfitResult = await prisma.order.aggregate({
        where: {
          status: 'PAID', // Считаем прибыль только по оплаченным заказам
          profit: {
            not: null, // Убедимся, что прибыль рассчитана
          },
        },
        _sum: {
          profit: true,
        },
      });
      const totalProfit = totalProfitResult._sum.profit ? parseFloat(totalProfitResult._sum.profit.toString()) : 0;

      // 5. Количество новых пользователей за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsersCount = await prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Форматируем данные по статусам для удобства
      const statusCounts = ordersByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, {} as Record<string, number>);


      res.status(200).json({
        totalOrders: totalOrdersCount,
        ordersByStatus: statusCounts,
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        newUsersLast30Days: newUsersCount,
        // Можно добавить больше метрик: средний чек, топ товаров, и т.д.
      });

    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats', error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}