// pages/api/products/index.ts
// Этот файл является публичным API для получения всех товаров (с фильтрами и поиском)
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'; // Правильный путь к глобальному экземпляру Prisma
import { Category, Season, Gender } from '@prisma/client'; // Импортируем Enum-ы для TypeScript

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { search, category, season, gender } = req.query;

      // Создаем объект where для Prisma-запроса (для фильтрации и поиска)
      const where: any = {};

      // Фильтр по поисковому запросу (по названию и описанию)
      if (search && typeof search === 'string') {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } }, // Поиск по имени
          { description: { contains: search, mode: 'insensitive' } }, // Поиск по описанию
        ];
      }

      // Фильтры по категориям, сезонам, полу (проверяем и приводим строки к типам Enum)
      // Здесь используем английские значения, т.к. фронтенд отправляет их для фильтров
      if (category && typeof category === 'string' && Object.values(Category).includes(category as Category)) {
        where.category = category as Category;
      }
      if (season && typeof season === 'string' && Object.values(Season).includes(season as Season)) {
        where.season = season as Season;
      }
      if (gender && typeof gender === 'string' && Object.values(Gender).includes(gender as Gender)) {
        where.gender = gender as Gender;
      }

      const products = await prisma.product.findMany({
        where, // Применяем все фильтры
        include: {
          variants: true,
        },
        orderBy: {
          createdAt: 'desc', // Сортировка по дате создания
        },
      });
      res.status(200).json(products);
    } catch (error) {
      console.error('Failed to fetch public products with filters:', error);
      res.status(500).json({ message: 'Failed to fetch products', error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}