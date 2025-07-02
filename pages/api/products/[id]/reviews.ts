// pages/api/products/[id]/reviews.ts - API ДЛЯ ОТЗЫВОВ
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { getUserFromRequest } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== PRODUCTS REVIEWS API DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('=================================');

  const { id: productId } = req.query;

  if (typeof productId !== 'string') {
    console.log('Reviews API: Invalid product ID:', productId);
    return res.status(400).json({ message: 'Некорректный ID товара.' });
  }

  console.log('Reviews API: Processing request for product ID:', productId);

  if (req.method === 'GET') {
    try {
      console.log('Reviews API: Fetching reviews for product:', productId);
      const reviews = await prisma.review.findMany({
        where: { productId },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      console.log('Reviews API: Reviews fetched:', reviews.length);
      res.status(200).json(reviews);
    } catch (error) {
      console.error('Reviews API: Error fetching reviews:', error);
      res.status(500).json({ message: 'Ошибка при получении отзывов' });
    }
  } else if (req.method === 'POST') {
    console.log('Reviews API: Creating new review...');
    const user = await getUserFromRequest(req);
    if (!user) {
      console.log('Reviews API: User not authorized');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Reviews API: User authorized:', user.id);
    const { rating, text, imageUrls } = req.body;

    if (!rating) {
      console.log('Reviews API: Rating is required');
      return res.status(400).json({ message: 'Оценка является обязательной.' });
    }

    try {
      console.log('Reviews API: Creating review with data:', { rating, text, imageUrls, productId, userId: user.id });
      const newReview = await prisma.review.create({
        data: {
          rating: parseFloat(rating),
          text: text || null,
          imageUrls: imageUrls || [],
          productId,
          userId: user.id,
        },
      });
      console.log('Reviews API: Review created successfully:', newReview.id);
      res.status(201).json(newReview);
    } catch (error) {
      console.error('Reviews API: Error creating review:', error);
      res.status(500).json({ message: 'Не удалось создать отзыв' });
    }
  } else {
    console.log('Reviews API: Method not allowed:', req.method);
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}