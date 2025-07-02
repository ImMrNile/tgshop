// pages/api/admin/products/index.ts - ИСПРАВЛЕНО С ОТЛАДКОЙ
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

const categoryMap: Record<string, Category> = {
  'ОДЕЖДА': Category.CLOTHING,
  'ОБУВЬ': Category.FOOTWEAR,
  'АКСЕССУАРЫ': Category.ACCESSORIES,
  'CLOTHING': Category.CLOTHING,
  'FOOTWEAR': Category.FOOTWEAR,
  'ACCESSORIES': Category.ACCESSORIES,
};

const seasonMap: Record<string, Season> = {
  'ВЕСНА': Season.SPRING,
  'ЛЕТО': Season.SUMMER,
  'ОСЕНЬ': Season.AUTUMN,
  'ЗИМА': Season.WINTER,
  'ВСЕСЕЗОННЫЙ': Season.ALL_SEASON,
  'SPRING': Season.SPRING,
  'SUMMER': Season.SUMMER,
  'AUTUMN': Season.AUTUMN,
  'WINTER': Season.WINTER,
  'ALL_SEASON': Season.ALL_SEASON,
};

const genderMap: Record<string, Gender> = {
  'МУЖСКОЙ': Gender.MALE,
  'ЖЕНСКИЙ': Gender.FEMALE,
  'УНИСЕКС': Gender.UNISEX,
  'MALE': Gender.MALE,
  'FEMALE': Gender.FEMALE,
  'UNISEX': Gender.UNISEX,
};

const checkAdminAuth = (): boolean => {
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
  console.log('Admin Telegram ID from env exists:', !!adminTelegramId);
  return !!adminTelegramId;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== ADMIN PRODUCTS INDEX API DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('======================================');

  if (!checkAdminAuth()) {
    console.log('Admin auth failed');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      console.log('Fetching all products for admin...');
      const products = await prisma.product.findMany({
        include: {
          variants: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      console.log('Products fetched:', products.length);
      res.status(200).json(products);
    } catch (error) {
      console.error('Failed to fetch products for admin (GET):', error);
      res.status(500).json({ message: 'Failed to fetch products', error: (error as Error).message });
    }
  } 
  else if (req.method === 'POST') {
    try {
      console.log('Starting POST request processing...');
      const { fields, files } = await parseForm(req);
      console.log('Form parsed successfully');
      console.log('Fields received:', Object.keys(fields));
      console.log('Files received:', Object.keys(files));

      const name = fields.name as string;
      const brand = (fields.brand as string) || null;
      const description = (fields.description as string) || null;
      const composition = (fields.composition as string) || null;
      const careInstructions = (fields.careInstructions as string) || null;
      
      const categoryEnum = categoryMap[fields.category as string];
      const seasonEnum = seasonMap[fields.season as string];
      const genderEnum = genderMap[fields.gender as string];

      console.log('Enum mappings:', { 
        category: fields.category, 
        categoryEnum, 
        season: fields.season, 
        seasonEnum, 
        gender: fields.gender, 
        genderEnum 
      });

      if (!categoryEnum || !seasonEnum || !genderEnum) {
          console.log('Invalid enum values - details:', {
            category: { input: fields.category, mapped: categoryEnum, available: Object.keys(categoryMap) },
            season: { input: fields.season, mapped: seasonEnum, available: Object.keys(seasonMap) },
            gender: { input: fields.gender, mapped: genderEnum, available: Object.keys(genderMap) }
          });
          return res.status(400).json({ 
            message: 'Некорректное значение для категории, сезона или пола. Проверьте логи сервера.',
            details: {
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

      console.log('Prices parsed:', { price, oldPrice, costPrice });
      console.log('Variants parsed:', variants.length);

      const uploadedImageUrls: string[] = [];
      if (files.images && files.images.length > 0) {
        console.log('Uploading images:', files.images.length);
        for (const file of files.images) {
          try {
            console.log(`Uploading image: ${file.originalFilename}`);
            const result = await cloudinary.v2.uploader.upload(file.filepath, { 
              folder: 'elite-app-products/images', resource_type: 'image',
            });
            uploadedImageUrls.push(result.secure_url);
            console.log(`Image uploaded successfully: ${result.secure_url}`);
          } catch (uploadError: unknown) {
            console.error(`ERROR UPLOADING IMAGE ${file.originalFilename} to Cloudinary:`, uploadError);
          } finally {
            fs.unlinkSync(file.filepath);
          }
        }
      }

      const uploadedVideoUrls: string[] = [];
      if (files.videos && files.videos.length > 0) {
        console.log('Uploading videos:', files.videos.length);
        for (const file of files.videos) {
          try {
            console.log(`Uploading video: ${file.originalFilename}`);
            const result = await cloudinary.v2.uploader.upload(file.filepath, { 
              folder: 'elite-app-products/videos', resource_type: 'video',
            });
            uploadedVideoUrls.push(result.secure_url);
            console.log(`Video uploaded successfully: ${result.secure_url}`);
          } catch (uploadError: unknown) {
            console.error(`ERROR UPLOADING VIDEO ${file.originalFilename} to Cloudinary:`, uploadError);
          } finally {
            fs.unlinkSync(file.filepath);
          }
        }
      }

      if (!name || isNaN(price) || isNaN(costPrice) || !variants || variants.length === 0) {
        console.log('Validation failed - missing required fields');
        return res.status(400).json({ message: 'Отсутствуют обязательные поля или некорректные данные.' });
      }

      console.log('Creating new product...');
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
          images: uploadedImageUrls,
          videos: uploadedVideoUrls,
          variants: {
            create: variants.map((v: { color?: string; size: string; stock: number }) => ({ 
              color: v.color || null, 
              size: v.size, 
              stock: parseInt(String(v.stock)) 
            })),
          },
        },
        include: { variants: true },
      });
      
      console.log('Product created successfully:', newProduct.id);
      res.status(201).json(newProduct);
    } catch (error) {
      console.error('Failed to create product for admin (POST):', error);
      res.status(500).json({ message: 'Failed to create product', error: (error as Error).message });
    }
  } else {
    console.log('Method not allowed:', req.method);
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}