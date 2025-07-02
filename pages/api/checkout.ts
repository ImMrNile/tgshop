import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { processReferralEarning } from '../../lib/referralUtils'; 
import { OrderStatus, PaymentMethod, DeliveryService } from '@prisma/client'; 
import { sendTelegramNotification } from '../../lib/telegram-notifier'; 

// Define the shape of cart items
interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  product: {
    name: string;
    currentPrice: string;
    costPrice: string;
  };
  variant: {
    size: string;
    color?: string;
  };
}

// Define the shape of delivery details from the request
interface DeliveryDetailsInput { 
  type: DeliveryService;
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  region: string | null;
  postalCode: string | null; // This is string | null in your interface
  country: string;
  saveAddress: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { cart, deliveryDetails, paymentMethod, userId, agreedToPolicy }: {
    cart: CartItem[];
    deliveryDetails: DeliveryDetailsInput; 
    paymentMethod: PaymentMethod; 
    userId: string;
    agreedToPolicy: boolean;
  } = req.body;

  if (!cart || cart.length === 0) {
    return res.status(400).json({ message: 'Cart is empty.' });
  }
  if (!deliveryDetails) {
    return res.status(400).json({ message: 'Delivery details are required.' });
  }
  if (!paymentMethod) {
    return res.status(400).json({ message: 'Payment method is required.' });
  }
  if (!userId) {
    return res.status(401).json({ message: 'User ID is required for checkout.' });
  }
  if (!agreedToPolicy) {
    return res.status(400).json({ message: 'Agreement to policy is required.' });
  }

  let totalAmount = 0;
  let totalCostPrice = 0; 
  let profit = 0; 

  for (const item of cart) {
    const itemPrice = parseFloat(item.product.currentPrice);
    const itemCostPrice = parseFloat(item.product.costPrice);
    const quantity = item.quantity;

    totalAmount += itemPrice * quantity;
    totalCostPrice += itemCostPrice * quantity;
  }

  profit = totalAmount - totalCostPrice;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, firstName: true, lastName: true, username: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const order = await prisma.order.create({
      data: {
        userId: userId,
        deliveryType: deliveryDetails.type,
        deliveryAddress: deliveryDetails.address,
        deliveryPostalCode: deliveryDetails.postalCode || '', // Keep as string
        deliveryCountry: deliveryDetails.country,
        deliveryCity: deliveryDetails.city,
        deliveryRegion: deliveryDetails.region || null,
        deliveryPhoneNumber: deliveryDetails.phoneNumber,
        deliveryFullName: deliveryDetails.fullName,
        totalAmount: totalAmount,
        status: OrderStatus.PENDING,
        paymentMethod: paymentMethod,
        profit: profit,
        items: {
          create: cart.map((item: CartItem) => ({
            productId: item.productId,
            productVariantId: item.variantId,
            productName: item.product.name,
            productPrice: parseFloat(item.product.currentPrice),
            productCostPrice: parseFloat(item.product.costPrice),
            quantity: item.quantity,
          })),
        },
      },
    });

    // Optionally save delivery address if requested
    if (deliveryDetails.saveAddress) {
      const existingAddress = await prisma.deliveryDetail.findUnique({
        where: {
          userId_address: {
            userId: userId,
            address: deliveryDetails.address
          }
        }
      });

      if (!existingAddress) {
        await prisma.deliveryDetail.create({
          data: {
            userId: userId,
            type: deliveryDetails.type,
            fullName: deliveryDetails.fullName,
            phoneNumber: deliveryDetails.phoneNumber,
            address: deliveryDetails.address,
            city: deliveryDetails.city,
            region: deliveryDetails.region || null,
            // ИСПРАВЛЕНИЕ: postalCode должен быть строкой, не null. Используем '' если null
            postalCode: deliveryDetails.postalCode || '', 
            country: deliveryDetails.country,
            isDefault: false 
          }
        });
      }
    }

    if (user.telegramId && process.env.VERCEL_APP_URL) {
      const orderConfirmationMessage = `✅ Ваш заказ №${order.id.substring(0, 8).toUpperCase()} успешно создан!
Мы свяжемся с вами для уточнения деталей.

[Посмотреть детали заказа](${process.env.VERCEL_APP_URL}/orders/${order.id})`;
      await sendTelegramNotification(user.telegramId, orderConfirmationMessage, { parse_mode: 'MarkdownV2' });
    }

    res.status(201).json({ message: 'Order created successfully!', orderId: order.id, order });
  } catch (error: unknown) {
    console.error('Error during checkout:', error);
    res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create order.' });
  }
}