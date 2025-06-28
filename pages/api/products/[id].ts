// pages/api/products/[id].ts
// Этот файл является публичным API для получения одного товара по ID
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Правильный путь к глобальному экземпляру Prisma

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { id } = req.query;

    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          variants: true,
        },
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(200).json(product);
    } catch (error) {
      console.error('Failed to fetch public product by ID:', error);
      res.status(500).json({ message: 'Failed to fetch product', error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}