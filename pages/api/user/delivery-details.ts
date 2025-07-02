// pages/api/user/delivery-details.ts - ОБНОВЛЕНО
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== DELIVERY DETAILS API DEBUG ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('==================================');

  if (req.method === 'GET') {
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        console.log('GET: Missing or invalid userId');
        return res.status(400).json({ message: 'userId is required' });
      }

      console.log(`API /user/delivery-details (GET): Fetching addresses for user ${userId}`);
      
      const addresses = await prisma.deliveryDetail.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' }, // Сначала дефолтные адреса
          { createdAt: 'desc' }   // Потом по дате создания
        ]
      });

      console.log(`API /user/delivery-details (GET): Found ${addresses.length} saved addresses for user ${userId}.`);
      res.status(200).json(addresses);

    } catch (error: unknown) {
      console.error('GET: Failed to fetch delivery details:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch delivery details';
      res.status(500).json({ message });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { userId, ...deliveryData } = req.body;

      if (!userId) {
        console.log('POST: Missing userId');
        return res.status(400).json({ message: 'userId is required' });
      }

      console.log(`API /user/delivery-details (POST): Creating new address for user ${userId}`);

      // Проверяем, не существует ли уже такой адрес
      const existingAddress = await prisma.deliveryDetail.findFirst({
        where: {
          userId,
          address: deliveryData.address,
          city: deliveryData.city,
          postalCode: deliveryData.postalCode,
        }
      });

      if (existingAddress) {
        console.log('POST: Address already exists');
        return res.status(409).json({ message: 'Такой адрес уже сохранен' });
      }

      const newAddress = await prisma.deliveryDetail.create({
        data: {
          ...deliveryData,
          userId,
          isDefault: false
        }
      });

      console.log(`API /user/delivery-details (POST): Created new address with ID ${newAddress.id}`);
      res.status(201).json(newAddress);

    } catch (error: unknown) {
      console.error('POST: Failed to create delivery detail:', error);
      const message = error instanceof Error ? error.message : 'Failed to create delivery detail';
      res.status(500).json({ message });
    }
  }
  else {
    console.log('Method not allowed:', req.method);
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}