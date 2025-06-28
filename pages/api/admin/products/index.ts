// pages/api/admin/products/index.ts
// ========================================

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import { Category, Season, Gender } from '@prisma/client';
import cloudinary from 'cloudinary';
import { parseForm } from '../../../../lib/formParser';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ИСПРАВЛЕНИЕ: мапы поддерживают и русские, и английские ключи
const categoryMap: Record<string, Category> = {
  // Русские ключи для создания
  'ОДЕЖДА': Category.CLOTHING,
  'ОБУВЬ': Category.FOOTWEAR,
  'АКСЕССУАРЫ': Category.ACCESSORIES,
  // Английские ключи для редактирования (из БД)
  'CLOTHING': Category.CLOTHING,
  'FOOTWEAR': Category.FOOTWEAR,
  'ACCESSORIES': Category.ACCESSORIES,
};

// ИСПРАВЛЕНИЕ: seasonMap поддерживает и русские, и английские ключи
const seasonMap: Record<string, Season> = {
  // Русские ключи для создания
  'ВЕСНА': Season.SPRING,
  'ЛЕТО': Season.SUMMER,
  'ОСЕНЬ': Season.AUTUMN,
  'ЗИМА': Season.WINTER,
  'ВСЕСЕЗОННЫЙ': Season.ALL_SEASON,
  // Английские ключи для редактирования (из БД)
  'SPRING': Season.SPRING,
  'SUMMER': Season.SUMMER,
  'AUTUMN': Season.AUTUMN,
  'WINTER': Season.WINTER,
  'ALL_SEASON': Season.ALL_SEASON,
};

// ИСПРАВЛЕНИЕ: genderMap поддерживает и русские, и английские ключи
const genderMap: Record<string, Gender> = {
  // Русские ключи для создания
  'МУЖСКОЙ': Gender.MALE,
  'ЖЕНСКИЙ': Gender.FEMALE,
  'УНИСЕКС': Gender.UNISEX,
  // Английские ключи для редактирования (из БД)
  'MALE': Gender.MALE,
  'FEMALE': Gender.FEMALE,
  'UNISEX': Gender.UNISEX,
};

// Вспомогательная функция для проверки авторизации админа
const checkAdminAuth = (req: NextApiRequest): boolean => {
  return !!process.env.ADMIN_TELEGRAM_ID;
};

// Основной обработчик API-роута
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Проверка авторизации для всех запросов к админ-API
  if (!checkAdminAuth(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Обработка GET-запроса (получение списка товаров для админ-панели)
  if (req.method === 'GET') {
    try {
      const products = await prisma.product.findMany({
        include: {
          variants: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      res.status(200).json(products);
    } catch (error) {
      console.error('Failed to fetch products for admin (GET):', error);
      res.status(500).json({ message: 'Failed to fetch products', error: (error as Error).message });
    }
  } 
  // Обработка POST-запроса (создание нового товара админом)
  else if (req.method === 'POST') {
    try {
      const { fields, files } = await parseForm(req);

      console.log('--- Product Creation POST Request Debug ---');
      console.log('Received fields:', fields);
      console.log('Available categoryMap keys:', Object.keys(categoryMap)); // Логируем доступные ключи
      console.log('Available seasonMap keys:', Object.keys(seasonMap));
      console.log('Available genderMap keys:', Object.keys(genderMap));
      
      const name = fields.name as string;
      const brand = (fields.brand as string) || null;
      const description = (fields.description as string) || null;
      const composition = (fields.composition as string) || null;
      const careInstructions = (fields.careInstructions as string) || null;
      
      // Преобразуем строковые значения из формы в Enum-значения через карты
      const categoryEnum = categoryMap[fields.category as string];
      const seasonEnum = seasonMap[fields.season as string];
      const genderEnum = genderMap[fields.gender as string];

      console.log('Input category:', fields.category, '-> Mapped:', categoryEnum);
      console.log('Input season:', fields.season, '-> Mapped:', seasonEnum);
      console.log('Input gender:', fields.gender, '-> Mapped:', genderEnum);

      // Валидация преобразования Enum-ов
      if (!categoryEnum || !seasonEnum || !genderEnum) {
          return res.status(400).json({ 
            message: 'Некорректное значение для категории, сезона или пола. Проверьте логи сервера.',
            details: { // Добавляем детали для отладки
              category: { input: fields.category, mapped: categoryEnum, available: Object.keys(categoryMap) },
              season: { input: fields.season, mapped: seasonEnum, available: Object.keys(seasonMap) },
              gender: { input: fields.gender, mapped: genderEnum, available: Object.keys(genderMap) }
            }
          });
      }
      
      const price = parseFloat(fields.price as string);
      const oldPrice = fields.oldPrice ? parseFloat(fields.oldPrice as string) : null;
      const costPrice = parseFloat(fields.costPrice as string);
      const variants = JSON.parse(fields.variants as string);

      // Логирование и обработка загрузки изображений
      const uploadedImageUrls: string[] = [];
      if (files.images && files.images.length > 0) {
        for (const file of files.images) {
          try {
            console.log(`Attempting to upload image: ${file.originalFilename} from ${file.filepath}`);
            const result = await cloudinary.v2.uploader.upload(file.filepath, { 
              folder: 'elite-app-products/images', resource_type: 'image',
            });
            console.log(`Cloudinary upload successful for ${file.originalFilename}: ${result.secure_url}`);
            uploadedImageUrls.push(result.secure_url);
          } catch (uploadError: any) {
            console.error(`ERROR UPLOADING IMAGE ${file.originalFilename} to Cloudinary:`, uploadError);
            // Можно добавить res.status(500).json({ message: 'Failed to upload image', details: uploadError.message });
            // Но пока что продолжаем, чтобы не блокировать создание товара из-за одной картинки
          } finally {
            fs.unlinkSync(file.filepath); // Удаляем временный файл
          }
        }
      }

      // Логирование и обработка загрузки видео
      const uploadedVideoUrls: string[] = [];
      if (files.videos && files.videos.length > 0) {
        for (const file of files.videos) {
          try {
            console.log(`Attempting to upload video: ${file.originalFilename} from ${file.filepath}`);
            const result = await cloudinary.v2.uploader.upload(file.filepath, { 
              folder: 'elite-app-products/videos', resource_type: 'video',
            });
            console.log(`Cloudinary upload successful for ${file.originalFilename}: ${result.secure_url}`);
            uploadedVideoUrls.push(result.secure_url);
          } catch (uploadError: any) {
            console.error(`ERROR UPLOADING VIDEO ${file.originalFilename} to Cloudinary:`, uploadError);
          } finally {
            fs.unlinkSync(file.filepath); // Удаляем временный файл
          }
        }
      }

      if (!name || isNaN(price) || isNaN(costPrice) || !variants || variants.length === 0) {
        return res.status(400).json({ message: 'Отсутствуют обязательные поля или некорректные данные.' });
      }

      const newProduct = await prisma.product.create({
        data: {
          name, 
          brand, 
          description, 
          composition, 
          careInstructions, 
          category: categoryEnum, 
          season: seasonEnum,     
          gender: genderEnum,     
          price, 
          oldPrice, 
          costPrice,
          currentPrice: oldPrice && oldPrice > price ? price : price,
          images: uploadedImageUrls, // Сохраняем URL-ы
          videos: uploadedVideoUrls, // Сохраняем URL-ы
          variants: {
            create: variants.map((v: any) => ({ 
              color: v.color || null, 
              size: v.size, 
              stock: parseInt(String(v.stock)) 
            })),
          },
        },
        include: { variants: true },
      });
      
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Failed to create product for admin (POST):', error);
      res.status(500).json({ message: 'Failed to create product', error: (error as Error).message });
    }
  } 
  else if (req.method === 'GET') {
    try {
      const products = await prisma.product.findMany({
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json(products);
    } catch (error) {
      console.error('Failed to fetch products for admin (GET):', error);
      res.status(500).json({ message: 'Failed to fetch products', error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}