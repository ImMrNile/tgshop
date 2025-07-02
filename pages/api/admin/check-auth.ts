
// pages/api/checkout.ts - ИСПРАВЛЕНО (правильная типизация)
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { DeliveryService, PaymentMethod, OrderStatus } from '@prisma/client';

// Helper function to check if a value is a valid Enum member
function isValidEnumValue<T extends object>(enumObject: T, value: unknown): value is T[keyof T] {
  return Object.values(enumObject).includes(value as T[keyof T]);
}

// Правильные типы для элементов заказа
interface OrderItemData {
  productId: string;
  productName: string;
  productPrice: number;
  productCostPrice: number;
  productVariantId: string;
  quantity: number;
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

    // Input Validation
    if (!userId) {
      return res.status(401).json({ message: 'Пользователь не авторизован.' });
    }

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

    // Order Creation Logic within a Transaction
    await prisma.$transaction(async (tx) => {
      // 1. Get user data from the DB to find their discount
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { personalDiscount: true },
      });

      if (!user) {
        throw new Error('Пользователь не найден в базе данных.');
      }
      const personalDiscount = user.personalDiscount ? parseFloat(user.personalDiscount.toString()) : 0;

      // 2. Calculate subtotal and prepare order items
      let subTotal = 0;
      const orderItemsData: OrderItemData[] = []; // ИСПРАВЛЕНО: добавлена типизация

      for (const item of cart) {
        const product = await tx.product.findUnique({
          where: { id: item.product.id },
          include: { variants: true }
        });

        if (!product) {
          throw new Error(`Товар с ID ${item.product.id} не найден.`);
        }

        const variant = product.variants.find((v: { id: string }) => v.id === item.variant.id); // ИСПРАВЛЕНО: добавлена типизация параметра
        if (!variant || variant.stock < item.quantity) {
          throw new Error(`Вариант товара "${product.name}" (${item.variant.size}) закончился на складе или его не хватает.`);
        }

        // Decrement stock for the purchased variant
        await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: item.quantity } }
        });

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

      // 3. Apply personal discount
      const discountAmount = subTotal * (personalDiscount / 100);
      const finalTotalAmount = subTotal - discountAmount;

      // 4. Create the order in the database
      const newOrder = await tx.order.create({
        data: {
          userId: userId,
          deliveryType: deliveryDetails.type,
          deliveryAddress: deliveryDetails.address,
          deliveryPostalCode: deliveryDetails.postalCode,
          deliveryCountry: deliveryDetails.country,
          deliveryCity: deliveryDetails.city,
          deliveryRegion: deliveryDetails.region || null,
          deliveryPhoneNumber: deliveryDetails.phoneNumber,
          deliveryFullName: deliveryDetails.fullName,
          totalAmount: finalTotalAmount,
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

      // 5. (Optional) Save the delivery address for the user
      if (deliveryDetails.saveAddress && deliveryDetails.address) {
        // ИСПРАВЛЕНО: убрали деструктуризацию saveAddress, так как она не используется
        const detailsToSave = {
          type: deliveryDetails.type,
          fullName: deliveryDetails.fullName,
          phoneNumber: deliveryDetails.phoneNumber,
          address: deliveryDetails.address,
          city: deliveryDetails.city,
          region: deliveryDetails.region,
          postalCode: deliveryDetails.postalCode,
          country: deliveryDetails.country
        };
        
        const existingAddress = await tx.deliveryDetail.findFirst({
          where: {
            userId: userId,
            address: detailsToSave.address,
            city: detailsToSave.city,
            postalCode: detailsToSave.postalCode,
          },
        });
        if (!existingAddress) {
          await tx.deliveryDetail.create({
            data: {
              ...detailsToSave,
              userId: userId,
              isDefault: false,
            },
          });
        }
      }

      // If the transaction is successful, send the response
      res.status(201).json({ message: 'Заказ успешно создан!', order: newOrder });
    });

  } catch (error: unknown) {
    console.error('Ошибка при создании заказа:', error);
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера.';
    res.status(500).json({ message });
  }
}