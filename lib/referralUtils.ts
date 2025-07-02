// lib/referralUtils.ts - Утилиты для работы с рефералами

import prisma from './prisma';

// Функция для начисления реферальных выплат при завершении заказа
export async function processReferralEarning(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          include: {
            referrer: true
          }
        }
      }
    });

    if (!order || !order.user.referrer || order.status !== 'DELIVERED') {
      return;
    }

    // Проверяем, не была ли уже начислена реферальная выплата
    const existingPayout = await prisma.referralPayout.findUnique({
      where: { orderId }
    });

    if (existingPayout) {
      return;
    }

    const referrer = order.user.referrer;
    const referralPercentage = referrer.referralPercentage || 3.0;
    const orderAmount = Number(order.totalAmount);
    const earningAmount = (orderAmount * referralPercentage) / 100;

    // Создаем запись о реферальной выплате
    await prisma.referralPayout.create({
      data: {
        userId: referrer.id,
        orderId: orderId,
        amount: earningAmount
      }
    });

    // Обновляем баланс реферера
    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        totalReferralEarnings: {
          increment: earningAmount
        },
        availableBalance: {
          increment: earningAmount
        }
      }
    });

    console.log(`Referral earning processed: ${earningAmount} for user ${referrer.id}`);

  } catch (error) {
    console.error('Error processing referral earning:', error);
  }
}

// Функция для обработки выплаты (когда админ подтверждает выплату)
export async function processPayoutCompletion(payoutRequestId: string) {
  try {
    const payoutRequest = await prisma.payoutRequest.findUnique({
      where: { id: payoutRequestId },
      include: { user: true }
    });

    if (!payoutRequest || payoutRequest.status !== 'PENDING') {
      throw new Error('Invalid payout request');
    }

    const payoutAmount = Number(payoutRequest.amount);

    await prisma.$transaction(async (tx) => {
      // Обновляем статус запроса на выплату
      await tx.payoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date()
        }
      });

      // Списываем сумму с баланса пользователя
      await tx.user.update({
        where: { id: payoutRequest.userId },
        data: {
          availableBalance: {
            decrement: payoutAmount
          }
        }
      });
    });

    console.log(`Payout completed: ${payoutAmount} for user ${payoutRequest.userId}`);

  } catch (error) {
    console.error('Error processing payout completion:', error);
    throw error;
  }
}