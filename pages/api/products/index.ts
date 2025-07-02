// pages/api/products/index.ts - ПУБЛИЧНЫЙ API (ТОЛЬКО GET)
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { Category, Season, Gender } from '@prisma/client';

interface WhereInput {
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    description?: { contains: string; mode: 'insensitive' };
  }>;
  category?: Category;
  season?: Season;
  gender?: Gender;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== PUBLIC PRODUCTS INDEX API DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('======================================');

  if (req.method === 'GET') {
    try {
      const { search, category, season, gender } = req.query;
      console.log('Public API: Search params:', { search, category, season, gender });

      const where: WhereInput = {};

      if (search && typeof search === 'string') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
        console.log('Public API: Added search filter:', search);
      }

      if (category && typeof category === 'string' && Object.values(Category).includes(category as Category)) {
        where.category = category as Category;
        console.log('Public API: Added category filter:', category);
      }
      if (season && typeof season === 'string' && Object.values(Season).includes(season as Season)) {
        where.season = season as Season;
        console.log('Public API: Added season filter:', season);
      }
      if (gender && typeof gender === 'string' && Object.values(Gender).includes(gender as Gender)) {
        where.gender = gender as Gender;
        console.log('Public API: Added gender filter:', gender);
      }

      console.log('Public API: Fetching products with filters...');
      const products = await prisma.product.findMany({
        where,
        include: {
          variants: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      console.log('Public API: Products fetched:', products.length);
      res.status(200).json(products);
    } catch (error) {
      console.error('Public API: Failed to fetch products with filters:', error);
      res.status(500).json({ message: 'Failed to fetch products', error: (error as Error).message });
    }
  } else {
    console.log('Public API: Method not allowed:', req.method);
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}