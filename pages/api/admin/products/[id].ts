// pages/api/admin/products/[id].ts
import type { NextApiRequest, NextApiResponse, PageConfig } from 'next';
import prisma from '../../../../lib/prisma';
import type { Prisma } from '@prisma/client';
// --- ИСПРАВЛЕНО: Раздельный импорт типов и значений ---
import { Category, Season, Gender } from '@prisma/client';
import cloudinary from 'cloudinary';
import { parseForm, FormidableFile } from '../../../../lib/formParser';
import fs from 'fs';

export const config: PageConfig = {
  api: {
    bodyParser: false,
  },
};

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const categoryMap: Record<string, Category> = { 'ОДЕЖДА': Category.CLOTHING, 'ОБУВЬ': Category.FOOTWEAR, 'АКСЕССУАРЫ': Category.ACCESSORIES, 'CLOTHING': Category.CLOTHING, 'FOOTWEAR': Category.FOOTWEAR, 'ACCESSORIES': Category.ACCESSORIES };
const seasonMap: Record<string, Season> = { 'ВЕСНА': Season.SPRING, 'ЛЕТО': Season.SUMMER, 'ОСЕНЬ': Season.AUTUMN, 'ЗИМА': Season.WINTER, 'ВСЕСЕЗОННЫЙ': Season.ALL_SEASON, 'SPRING': Season.SPRING, 'SUMMER': Season.SUMMER, 'AUTUMN': Season.AUTUMN, 'WINTER': Season.WINTER, 'ALL_SEASON': Season.ALL_SEASON };
const genderMap: Record<string, Gender> = { 'МУЖСКОЙ': Gender.MALE, 'ЖЕНСКИЙ': Gender.FEMALE, 'УНИСЕКС': Gender.UNISEX, 'MALE': Gender.MALE, 'FEMALE': Gender.FEMALE, 'UNISEX': Gender.UNISEX };

const checkAdminAuth = (): boolean => !!process.env.ADMIN_TELEGRAM_ID;

type VariantData = { id?: string; color?: string | null; size: string; stock: number; };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminAuth()) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.query;
  if (typeof id !== 'string') return res.status(400).json({ message: 'Invalid product ID' });

  if (req.method === 'GET') {
    try {
      const product = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.status(200).json(product);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      res.status(500).json({ message: 'Failed to fetch product' });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      const { fields, files } = await parseForm(req);

      const categoryEnum = categoryMap[fields.category as string];
      const seasonEnum = seasonMap[fields.season as string];
      const genderEnum = genderMap[fields.gender as string];
      if (!categoryEnum || !seasonEnum || !genderEnum) {
        return res.status(400).json({ message: 'Некорректное значение для категории, сезона или пола.' });
      }

      const variants: VariantData[] = JSON.parse(fields.variants as string);

      const uploadFile = async (file: FormidableFile, folder: string, resource_type: 'image' | 'video'): Promise<string> => {
        try {
          const result = await cloudinary.v2.uploader.upload(file.filepath, { folder, resource_type });
          return result.secure_url;
        } finally {
          fs.unlinkSync(file.filepath);
        }
      };

      const newImageUrls = await Promise.all((files.images || []).map(file => uploadFile(file, 'elite-app-products/images', 'image')));
      const newVideoUrls = await Promise.all((files.videos || []).map(file => uploadFile(file, 'elite-app-products/videos', 'video')));
      
      const existingImages = (fields.existingImages as string[] | string) || [];
      const finalImageUrls = [...(Array.isArray(existingImages) ? existingImages : [existingImages]), ...newImageUrls];
      
      const existingVideos = (fields.existingVideos as string[] | string) || [];
      const finalVideoUrls = [...(Array.isArray(existingVideos) ? existingVideos : [existingVideos]), ...newVideoUrls];

      const price = parseFloat(fields.price as string);
      const costPrice = parseFloat(fields.costPrice as string);
      const oldPrice = fields.oldPrice ? parseFloat(fields.oldPrice as string) : null;

      if (!fields.name || isNaN(price) || isNaN(costPrice) || !variants.length) {
        return res.status(400).json({ message: 'Отсутствуют обязательные поля.' });
      }

      await prisma.$transaction(async (tx) => {
        const existingDbVariants = await tx.productVariant.findMany({ where: { productId: id } });
        
        const variantsToUpdate = variants.filter((v): v is Required<VariantData> => !!v.id);
        const variantsToCreate = variants.filter((v) => !v.id);
        const variantsToDelete = existingDbVariants.filter(v => !variantsToUpdate.some(uv => uv.id === v.id));

        if (variantsToDelete.length > 0) await tx.productVariant.deleteMany({ where: { id: { in: variantsToDelete.map(v => v.id) } } });
        if (variantsToCreate.length > 0) await tx.productVariant.createMany({ data: variantsToCreate.map(v => ({ ...v, productId: id })) });
        await Promise.all(variantsToUpdate.map(v => tx.productVariant.update({ where: { id: v.id }, data: { color: v.color, size: v.size, stock: v.stock } })));

        await tx.product.update({
          where: { id },
          data: {
            name: fields.name as string,
            brand: fields.brand as string || null,
            description: fields.description as string || null,
            composition: fields.composition as string || null,
            careInstructions: fields.careInstructions as string || null,
            category: categoryEnum,
            season: seasonEnum,
            gender: genderEnum,
            price, oldPrice, costPrice,
            currentPrice: price, // Обновляем currentPrice
            images: finalImageUrls,
            videos: finalVideoUrls,
          },
        });
      });

      res.status(200).json({ message: "Product updated successfully" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to update product:', error);
      res.status(500).json({ message: 'Failed to update product', error: errorMessage });
    }
    return;
  }
  
  if (req.method === 'DELETE') {
    try {
      await prisma.product.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      console.error('Failed to delete product:', error);
      res.status(500).json({ message: 'Failed to delete product' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}