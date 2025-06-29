// pages/api/checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { DeliveryService, PaymentMethod, OrderStatus } from '@prisma/client';

// Вспомогательная функция для проверки, что значение является допустимым для Enum
function isValidEnumValue<T extends object>(enumObject: T, value: unknown): value is T[keyof T] {
  return Object.values(enumObject).includes(value as T[keyof T]);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const {
      cart,
      deliveryDetails,
      paymentMethod,
      userId,
      agreedToPolicy
    } = req.body;

    // --- Валидация входных данных ---
    if (!cart || cart.length === 0) {
      return res.status(400).json({ message: 'Корзина не может быть пустой.' });
    }
    if (!deliveryDetails || !deliveryDetails.fullName || !deliveryDetails.phoneNumber || !deliveryDetails.address) {
      return res.status(400).json({ message: 'Необходимо указать полные данные для доставки.' });
    }
    if (!isValidEnumValue(DeliveryService, deliveryDetails.type)) {
      return res.status(400).json({ message: 'Выбран неверный способ доставки.' });
    }
    if (!isValidEnumValue(PaymentMethod, paymentMethod)) {
      return res.status(400).json({ message: 'Выбран неверный способ оплаты.' });
    }
    if (agreedToPolicy !== true) {
      return res.status(400).json({ message: 'Необходимо согласиться с политикой невозвратности товара.' });
    }
    
    const tempUserId = userId || '2138182633';

    // --- Логика создания заказа ---

    // 1. Получаем данные пользователя из БД, чтобы узнать его скидку
    const user = await prisma.user.findUnique({
      where: { id: tempUserId },
      select: { personalDiscount: true },
    });
    const personalDiscount = user?.personalDiscount ? parseFloat(user.personalDiscount.toString()) : 0;

    // 2. Рассчитываем общую сумму товаров (субтотал)
    let subTotal = 0;
    const orderItemsData = [];

    for (const item of cart) {
        const product = await prisma.product.findUnique({
            where: { id: item.product.id },
            include: { variants: true }
        });

        if (!product) {
            return res.status(404).json({ message: `Товар с ID ${item.product.id} не найден.`});
        }

        const variant = product.variants.find(v => v.id === item.variant.id);
        if (!variant || variant.stock < item.quantity) {
             return res.status(400).json({ message: `Вариант товара "${product.name}" закончился на складе.`});
        }

        const price = parseFloat(product.currentPrice.toString());
        subTotal += price * item.quantity;

        orderItemsData.push({
            productId: product.id,
            productName: product.name,
            productPrice: price,
            productCostPrice: parseFloat(product.costPrice.toString()),
            productVariantId: variant.id,
            quantity: item.quantity
        });
    }

    // 3. Применяем персональную скидку к субтоталу
    const discountAmount = subTotal * (personalDiscount / 100);
    const finalTotalAmount = subTotal - discountAmount;

    // 4. Создаем заказ в базе данных с финальной суммой
    const newOrder = await prisma.order.create({
      data: {
        userId: tempUserId,
        deliveryType: deliveryDetails.type,
        deliveryAddress: deliveryDetails.address,
        deliveryPostalCode: deliveryDetails.postalCode,
        deliveryCountry: deliveryDetails.country,
        deliveryCity: deliveryDetails.city,
        deliveryRegion: deliveryDetails.region || null,
        deliveryPhoneNumber: deliveryDetails.phoneNumber,
        deliveryFullName: deliveryDetails.fullName,
        totalAmount: finalTotalAmount, // <-- Сохраняем итоговую сумму с учетом скидки
        status: OrderStatus.PENDING,
        paymentMethod: paymentMethod,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    // 5. (Опционально) Сохраняем адрес доставки для пользователя
    if (deliveryDetails.saveAddress && deliveryDetails.address) {
      const { saveAddress, ...detailsToSave } = deliveryDetails;
      const existingAddress = await prisma.deliveryDetail.findFirst({
        where: {
          userId: tempUserId,
          address: detailsToSave.address,
        },
      });
      if (!existingAddress) {
        await prisma.deliveryDetail.create({
          data: {
            ...detailsToSave,
            userId: tempUserId,
            isDefault: false,
          },
        });
      }
    }

    res.status(201).json({ message: 'Заказ успешно создан!', order: newOrder });

  } catch (error: unknown) {
    console.error('Ошибка при создании заказа:', error);
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера.';
    res.status(500).json({ message });
  }
}