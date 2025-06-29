// pages/api/admin/stats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { OrderStatus } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    // 1. Получаем все заказы, которые были оплачены или завершены
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

    // 2. Считаем основные финансовые показатели
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
    const netProfit = totalRevenue - totalCostOfGoods - totalDeliveryCosts;

    // 3. Собираем общую статистику
    const totalUsers = await prisma.user.count();
    const totalOrders = await prisma.order.count();
    const totalProducts = await prisma.product.count();

    // 4. Статистика по продажам за последние 30 дней для графика
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesData = await prisma.order.groupBy({
        by: ['createdAt'],
        where: {
            createdAt: { gte: thirtyDaysAgo },
            status: { in: [OrderStatus.PAID, OrderStatus.DELIVERED, OrderStatus.SHIPPED]}
        },
        _sum: {
            totalAmount: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    // Форматируем данные для графика
    const formattedSalesData = salesData.map(d => ({
        date: d.createdAt.toISOString().split('T')[0], // Группируем по дню
        revenue: d._sum.totalAmount ? parseFloat(d._sum.totalAmount.toString()) : 0
    })).reduce((acc, current) => {
        const existing = acc.find(item => item.date === current.date);
        if (existing) {
            existing.revenue += current.revenue;
        } else {
            acc.push(current);
        }
        return acc;
    }, [] as {date: string, revenue: number}[]);


    // 5. Топ продаваемых товаров
    const topProducts = await prisma.orderItem.groupBy({
        by: ['productName'],
        _sum: {
            quantity: true
        },
        orderBy: {
            _sum: {
                quantity: 'desc'
            }
        },
        take: 5
    });


    res.status(200).json({
      totalRevenue,
      netProfit,
      totalOrders,
      totalUsers,
      totalProducts,
      salesData: formattedSalesData,
      topProducts: topProducts.map(p => ({name: p.productName, count: p._sum.quantity}))
    });

  } catch (error) {
    console.error('Ошибка при расчете статистики:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}