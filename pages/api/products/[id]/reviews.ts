// pages/api/products/[id]/reviews.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: productId } = req.query;

  if (typeof productId !== 'string') {
    return res.status(400).json({ message: 'Некорректный ID товара.' });
  }

  if (req.method === 'GET') {
    try {
      const reviews = await prisma.review.findMany({
        where: { productId },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json(reviews);
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при получении отзывов' });
    }
  } else if (req.method === 'POST') {
    // В реальном приложении ID пользователя нужно получать из сессии
    const userId = '2138182633'; // Используем наш тестовый ID
    const { rating, text, imageUrls } = req.body;

    if (!rating) {
      return res.status(400).json({ message: 'Оценка является обязательной.' });
    }

    try {
      const newReview = await prisma.review.create({
        data: {
          rating: parseFloat(rating),
          text: text || null,
          imageUrls: imageUrls || [],
          productId,
          userId,
        },
      });
      res.status(201).json(newReview);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Не удалось создать отзыв' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}