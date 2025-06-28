// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../lib/prisma';
import type { PrismaClient, Prisma } from '@prisma/client';
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

const checkAdminAuth = (req: NextApiRequest): boolean => !!process.env.ADMIN_TELEGRAM_ID;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminAuth(req)) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ message: 'Invalid product ID' });

  if (req.method === 'GET') {
    try {
      const product = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.status(200).json(product);
    } catch (error) {
      console.error('Failed to fetch product for admin (GET by ID):', error);
      res.status(500).json({ message: 'Failed to fetch product', error: (error as Error).message });
    }
  } else if (req.method === 'PUT') {
    try {
      const { fields, files } = await parseForm(req);

      console.log('--- Product Update PUT Request Debug ---');
      console.log('Received fields:', fields);
      console.log('Available categoryMap keys:', Object.keys(categoryMap));
      console.log('Available seasonMap keys:', Object.keys(seasonMap));
      console.log('Available genderMap keys:', Object.keys(genderMap));

      const name = fields.name as string;
      const brand = (fields.brand as string) || null;
      const description = fields.description as string || null;
      const composition = fields.composition as string || null;
      const careInstructions = fields.careInstructions as string || null;
      
      const categoryEnum = categoryMap[fields.category as string];
      const seasonEnum = seasonMap[fields.season as string];
      const genderEnum = genderMap[fields.gender as string];

      console.log('Input category:', fields.category, '-> Mapped:', categoryEnum);
      console.log('Input season:', fields.season, '-> Mapped:', seasonEnum);
      console.log('Input gender:', fields.gender, '-> Mapped:', genderEnum);

      if (!categoryEnum || !seasonEnum || !genderEnum) {
          return res.status(400).json({
            message: 'Некорректное значение для категории, сезона или пола.',
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
      const existingImages = fields.existingImages || [];
      const existingVideos = fields.existingVideos || [];

      // Логирование и обработка загрузки новых изображений
      const newUploadedImageUrls: string[] = [];
      if (files.images && files.images.length > 0) {
        for (const file of files.images) {
          try {
            console.log(`Attempting to upload new image: ${file.originalFilename} from ${file.filepath}`);
            const result = await cloudinary.v2.uploader.upload(file.filepath, {
              folder: 'elite-app-products/images', resource_type: 'image',
            });
            console.log(`Cloudinary upload successful for ${file.originalFilename}: ${result.secure_url}`);
            newUploadedImageUrls.push(result.secure_url);
          } catch (uploadError: any) {
            console.error(`ERROR UPLOADING NEW IMAGE ${file.originalFilename} to Cloudinary:`, uploadError);
          } finally {
            fs.unlinkSync(file.filepath); // Удаляем временный файл
          }
        }
      }

      // Логирование и обработка загрузки новых видео
      const newUploadedVideoUrls: string[] = [];
      if (files.videos && files.videos.length > 0) {
        for (const file of files.videos) {
          try {
            console.log(`Attempting to upload new video: ${file.originalFilename} from ${file.filepath}`);
            const result = await cloudinary.v2.uploader.upload(file.filepath, {
              folder: 'elite-app-products/videos', resource_type: 'video',
            });
            console.log(`Cloudinary upload successful for ${file.originalFilename}: ${result.secure_url}`);
            newUploadedVideoUrls.push(result.secure_url);
          } catch (uploadError: any) {
            console.error(`ERROR UPLOADING NEW VIDEO ${file.originalFilename} to Cloudinary:`, uploadError);
          } finally {
            fs.unlinkSync(file.filepath); // Удаляем временный файл
          }
        }
      }

      const finalImageUrls = [...existingImages as string[], ...newUploadedImageUrls];
      const finalVideoUrls = [...existingVideos as string[], ...newUploadedVideoUrls];

      if (!name || isNaN(price) || isNaN(costPrice) || !variants || variants.length === 0) {
        return res.status(400).json({ message: 'Отсутствуют обязательные поля или некорректные данные.' });
      }

      const updatedProduct = await prisma.$transaction(async (tx) => {
        type PrismaProductVariant = Prisma.ProductVariantGetPayload<{}>;

        const existingVariants = await tx.productVariant.findMany({ where: { productId: id } });

        const variantsToUpdate = variants.filter((v: any) => v.id);
        const variantsToCreate = variants.filter((v: any) => !v.id);
        const variantsToDelete = existingVariants.filter(
          (ev: PrismaProductVariant) => !variantsToUpdate.some((v: any) => v.id === ev.id)
        );

        if (variantsToDelete.length > 0) { await tx.productVariant.deleteMany({ where: { id: { in: variantsToDelete.map((v) => v.id) } } }); }

        await Promise.all(
          variantsToUpdate.map((v: { id: string; color?: string | null; size: string; stock: number }) =>
            tx.productVariant.update({ where: { id: v.id }, data: { color: v.color || null, size: v.size, stock: parseInt(String(v.stock)) } })
          )
        );

        if (variantsToCreate.length > 0) {
          await tx.productVariant.createMany({
            data: variantsToCreate.map((v: { color?: string | null; size: string; stock: number }) => ({
              productId: id, color: v.color || null, size: v.size, stock: parseInt(String(v.stock))
            })),
          });
        }

        return tx.product.update({
          where: { id },
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
            images: finalImageUrls,
            videos: finalVideoUrls,
          },
          include: { variants: true },
        });
      });

      res.status(200).json(updatedProduct);
    } catch (error) {
      console.error('Failed to update product for admin (PUT by ID):', error);
      res.status(500).json({ message: 'Failed to update product', error: (error as Error).message });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.product.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      console.error('Failed to delete product for admin (DELETE by ID):', error);
      res.status(500).json({ message: 'Failed to delete product' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}