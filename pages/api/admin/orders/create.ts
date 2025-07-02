// pages/api/orders/create.ts - ИСПРАВЛЕННЫЙ API создания заказа
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { getUserFromRequest } from '../../../../lib/auth';
import { DeliveryService, PaymentMethod } from '@prisma/client';

interface OrderItem {
  productId: string;
  productVariantId: string;
  quantity: number;
}

interface CreateOrderRequest {
  items: OrderItem[];
  deliveryType: DeliveryService;
  deliveryAddress: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryCity: string;
  deliveryRegion?: string;
  deliveryPhoneNumber: string;
  deliveryFullName: string;
  paymentMethod: PaymentMethod;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== CREATE ORDER API DEBUG ===');
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('===============================');

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log('CREATE ORDER: Unauthorized request');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('CREATE ORDER: User authenticated:', user.id);

    const {
      items,
      deliveryType,
      deliveryAddress,
      deliveryPostalCode,
      deliveryCountry,
      deliveryCity,
      deliveryRegion,
      deliveryPhoneNumber,
      deliveryFullName,
      paymentMethod
    }: CreateOrderRequest = req.body;

    // Валидация входных данных
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('CREATE ORDER: Invalid items array');
      return res.status(400).json({ message: 'Корзина пуста или некорректные данные товаров' });
    }

    if (!deliveryAddress || !deliveryPhoneNumber || !deliveryFullName) {
      console.log('CREATE ORDER: Missing delivery info');
      return res.status(400).json({ message: 'Не заполнены обязательные поля доставки' });
    }

    if (!paymentMethod || !Object.values(PaymentMethod).includes(paymentMethod)) {
      console.log('CREATE ORDER: Invalid payment method');
      return res.status(400).json({ message: 'Некорректный способ оплаты' });
    }

    console.log('CREATE ORDER: Validation passed, processing order...');

    // Используем транзакцию для создания заказа
    const result = await prisma.$transaction(async (tx) => {
      console.log('CREATE ORDER: Starting transaction...');

      // Получаем информацию о товарах и проверяем наличие
      const orderItemsData = [];
      let totalAmount = 0;

      for (const item of items) {
        console.log(`CREATE ORDER: Processing item ${item.productId}, variant ${item.productVariantId}`);

        // Проверяем продукт
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            variants: {
              where: { id: item.productVariantId }
            }
          }
        });

        if (!product) {
          console.log(`CREATE ORDER: Product not found: ${item.productId}`);
          throw new Error(`Товар с ID ${item.productId} не найден`);
        }

        const variant = product.variants[0];
        if (!variant) {
          console.log(`CREATE ORDER: Variant not found: ${item.productVariantId}`);
          throw new Error(`Вариант товара с ID ${item.productVariantId} не найден`);
        }

        // Проверяем наличие на складе
        if (variant.stock < item.quantity) {
          console.log(`CREATE ORDER: Insufficient stock for ${product.name} (${variant.size})`);
          throw new Error(`Недостаточно товара на складе: ${product.name} (${variant.size}). Доступно: ${variant.stock}`);
        }

        // Проверяем валидность количества
        if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
          console.log(`CREATE ORDER: Invalid quantity: ${item.quantity}`);
          throw new Error(`Некорректное количество для товара ${product.name}`);
        }

        const itemTotal = parseFloat(product.currentPrice.toString()) * item.quantity;
        totalAmount += itemTotal;

        orderItemsData.push({
          productId: item.productId,
          productVariantId: item.productVariantId,
          productName: product.name,
          productPrice: product.currentPrice,
          productCostPrice: product.costPrice,
          quantity: item.quantity
        });

        console.log(`CREATE ORDER: Item processed - ${product.name}: ${item.quantity}x${product.currentPrice} = ${itemTotal}`);
      }

      console.log(`CREATE ORDER: Total amount calculated: ${totalAmount}`);

      // Создаем заказ
      const order = await tx.order.create({
        data: {
          userId: user.id,
          deliveryType,
          deliveryAddress,
          deliveryPostalCode,
          deliveryCountry,
          deliveryCity,
          deliveryRegion: deliveryRegion || null,
          deliveryPhoneNumber,
          deliveryFullName,
          totalAmount,
          paymentMethod,
          status: 'PENDING',
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true
            }
          }
        }
      });

      console.log(`CREATE ORDER: Order created successfully with ID: ${order.id}`);

      // Обновляем количество товаров на складе
      for (const item of items) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
        console.log(`CREATE ORDER: Stock updated for variant ${item.productVariantId}: -${item.quantity}`);
      }

      return order;
    });

    console.log('CREATE ORDER: Transaction completed successfully');

    res.status(201).json({
      message: 'Заказ создан успешно',
      order: {
        id: result.id,
        totalAmount: parseFloat(result.totalAmount.toString()),
        status: result.status,
        paymentMethod: result.paymentMethod,
        itemsCount: result.items.length,
        createdAt: result.createdAt
      }
    });

  } catch (error) {
    console.error('CREATE ORDER: Error occurred:', error);
    
    // Возвращаем специфичные ошибки
    if (error instanceof Error) {
      if (error.message.includes('не найден') || 
          error.message.includes('Недостаточно') || 
          error.message.includes('Некорректное количество')) {
        return res.status(400).json({ 
          message: error.message,
          type: 'VALIDATION_ERROR'
        });
      }
    }

    res.status(500).json({ 
      message: 'Произошла ошибка при создании заказа. Попробуйте еще раз.',
      type: 'INTERNAL_ERROR'
    });
  }
}