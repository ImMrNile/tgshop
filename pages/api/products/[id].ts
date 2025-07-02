// pages/api/products/[id].ts - ПУБЛИЧНЫЙ API (ТОЛЬКО GET)
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== PUBLIC PRODUCTS [ID] API DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('=====================================');

  if (req.method === 'GET') {
    const { id } = req.query;

    if (typeof id !== 'string') {
      console.log('Public API: Invalid product ID:', id);
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    try {
      console.log('Public API: Fetching product with ID:', id);
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          variants: true,
        },
      });

      if (!product) {
        console.log('Public API: Product not found with ID:', id);
        return res.status(404).json({ message: 'Product not found' });
      }
      
      console.log('Public API: Product found:', product.name);
      res.status(200).json(product);
    } catch (error) {
      console.error('Public API: Failed to fetch product by ID:', error);
      res.status(500).json({ message: 'Failed to fetch product', error: (error as Error).message });
    }
  } else {
    console.log('Public API: Method not allowed:', req.method);
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}