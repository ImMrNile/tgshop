// pages/api/admin/products/[id].ts - ПОЛНОЕ ИСПРАВЛЕНИЕ
import type { NextApiRequest, NextApiResponse, PageConfig } from 'next';
import prisma from '../../../../lib/prisma';
import { Category, Season, Gender } from '@prisma/client';
import cloudinary from 'cloudinary';
import { parseForm, FormidableFile } from '../../../../lib/formParser';
import fs from 'fs';
import type { Prisma } from '@prisma/client';

// Интерфейс для данных формы
interface FormFields {
  name: string;
  brand?: string;
  description?: string;
  composition?: string;
  careInstructions?: string;
  category: string;
  season: string;
  gender: string;
  price: string;
  oldPrice?: string;
  costPrice: string;
  variants: string;
  existingImages?: string | string[];
  existingVideos?: string | string[];
}

interface FormFiles {
  images?: FormidableFile[];
  videos?: FormidableFile[];
}

// Функция для безопасного извлечения полей формы
function extractFormFields(rawFields: Record<string, string | string[]>): FormFields {
  return {
    name: Array.isArray(rawFields.name) ? rawFields.name[0] : rawFields.name || '',
    brand: Array.isArray(rawFields.brand) ? rawFields.brand[0] : rawFields.brand,
    description: Array.isArray(rawFields.description) ? rawFields.description[0] : rawFields.description,
    composition: Array.isArray(rawFields.composition) ? rawFields.composition[0] : rawFields.composition,
    careInstructions: Array.isArray(rawFields.careInstructions) ? rawFields.careInstructions[0] : rawFields.careInstructions,
    category: Array.isArray(rawFields.category) ? rawFields.category[0] : rawFields.category || '',
    season: Array.isArray(rawFields.season) ? rawFields.season[0] : rawFields.season || '',
    gender: Array.isArray(rawFields.gender) ? rawFields.gender[0] : rawFields.gender || '',
    price: Array.isArray(rawFields.price) ? rawFields.price[0] : rawFields.price || '0',
    oldPrice: Array.isArray(rawFields.oldPrice) ? rawFields.oldPrice[0] : rawFields.oldPrice,
    costPrice: Array.isArray(rawFields.costPrice) ? rawFields.costPrice[0] : rawFields.costPrice || '0',
    variants: Array.isArray(rawFields.variants) ? rawFields.variants[0] : rawFields.variants || '[]',
    existingImages: rawFields['existingImages[]'] || rawFields.existingImages,
    existingVideos: rawFields['existingVideos[]'] || rawFields.existingVideos,
  };
}

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

const categoryMap: Record<string, Category> = { 
  'ОДЕЖДА': Category.CLOTHING, 
  'ОБУВЬ': Category.FOOTWEAR, 
  'АКСЕССУАРЫ': Category.ACCESSORIES, 
  'CLOTHING': Category.CLOTHING, 
  'FOOTWEAR': Category.FOOTWEAR, 
  'ACCESSORIES': Category.ACCESSORIES 
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
  'ALL_SEASON': Season.ALL_SEASON 
};

const genderMap: Record<string, Gender> = { 
  'МУЖСКОЙ': Gender.MALE, 
  'ЖЕНСКИЙ': Gender.FEMALE, 
  'УНИСЕКС': Gender.UNISEX, 
  'MALE': Gender.MALE, 
  'FEMALE': Gender.FEMALE, 
  'UNISEX': Gender.UNISEX 
};

const checkAdminAuth = (): boolean => {
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
  console.log('Admin Telegram ID from env exists:', !!adminTelegramId);
  return !!adminTelegramId;
};

type VariantData = { 
  id?: string; 
  color?: string | null; 
  size: string; 
  stock: number; 
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== ADMIN PRODUCTS [ID] API DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Query ID specifically:', req.query.id);
  console.log('====================================');

  if (!checkAdminAuth()) {
    console.log('Admin auth failed - no ADMIN_TELEGRAM_ID');
    return res.status(401).json({ message: 'Unauthorized: Admin access required' });
  }

  const { id } = req.query;
  console.log('Extracted ID from query:', id, 'Type:', typeof id);

  if (!id || typeof id !== 'string') {
    console.log('Invalid product ID:', id);
    return res.status(400).json({ message: 'Invalid product ID format' });
  }

  console.log('Processing request for product ID:', id);

  if (req.method === 'GET') {
    try {
      console.log('GET: Fetching product with ID:', id);
      const product = await prisma.product.findUnique({ 
        where: { id }, 
        include: { variants: true } 
      });
      
      if (!product) {
        console.log('GET: Product not found with ID:', id);
        return res.status(404).json({ message: 'Product not found' });
      }
      
      console.log('GET: Product found:', product.name, 'with', product.variants.length, 'variants');
      res.status(200).json(product);
    } catch (error) {
      console.error('GET: Failed to fetch product:', error);
      res.status(500).json({ 
        message: 'Failed to fetch product', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
    return;
  }

  if (req.method === 'PUT') {
    try {
      console.log('PUT: Starting update for product ID:', id);
      
      let fields: FormFields, files: FormFiles;
      try {
        const parsed = await parseForm(req);
        fields = extractFormFields(parsed.fields);
        files = parsed.files as unknown as FormFiles;
        console.log('PUT: Form parsed successfully');
        console.log('PUT: Fields keys:', Object.keys(fields));
        console.log('PUT: Files keys:', Object.keys(files || {}));
      } catch (parseError: unknown) {
        console.error('PUT: Form parsing failed:', parseError);
        return res.status(400).json({ message: 'Failed to parse form data', error: parseError });
      }

      // Проверяем, что продукт существует
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        console.log('PUT: Product not found for update:', id);
        return res.status(404).json({ message: 'Product not found for update' });
      }

      const categoryEnum = categoryMap[fields.category as string];
      const seasonEnum = seasonMap[fields.season as string];
      const genderEnum = genderMap[fields.gender as string];
      
      console.log('PUT: Enum mappings:', { 
        category: fields.category, 
        categoryEnum, 
        season: fields.season, 
        seasonEnum, 
        gender: fields.gender, 
        genderEnum 
      });
      
      if (!categoryEnum || !seasonEnum || !genderEnum) {
        console.log('PUT: Invalid enum values');
        return res.status(400).json({ 
          message: 'Некорректное значение для категории, сезона или пола.',
          details: { categoryEnum, seasonEnum, genderEnum }
        });
      }

      let variants: VariantData[] = [];
      try {
        variants = JSON.parse(fields.variants || '[]');
        console.log('PUT: Variants parsed:', variants.length, 'items');
      } catch (variantError: unknown) {
        console.error('PUT: Variants parsing failed:', variantError);
        return res.status(400).json({ message: 'Invalid variants data' });
      }

      const uploadFile = async (file: FormidableFile, folder: string, resource_type: 'image' | 'video'): Promise<string> => {
        try {
          console.log(`PUT: Uploading ${resource_type}:`, file.originalFilename);
          const result = await cloudinary.v2.uploader.upload(file.filepath, { folder, resource_type });
          console.log(`PUT: Upload successful:`, result.secure_url);
          return result.secure_url;
        } catch (uploadError: unknown) {
          console.error(`PUT: Upload failed for ${file.originalFilename}:`, uploadError);
          throw uploadError;
        } finally {
          try {
            fs.unlinkSync(file.filepath);
          } catch (unlinkError: unknown) {
            console.warn('PUT: Failed to cleanup temp file:', unlinkError);
          }
        }
      };

      console.log('PUT: Processing file uploads...');
      const newImageUrls = files.images ? await Promise.all(
        files.images.map((file: FormidableFile) => uploadFile(file, 'elite-app-products/images', 'image'))
      ) : [];
      const newVideoUrls = files.videos ? await Promise.all(
        files.videos.map((file: FormidableFile) => uploadFile(file, 'elite-app-products/videos', 'video'))
      ) : [];
      
      // Обработка существующих медиа
      const existingImages = fields.existingImages;
      let finalImageUrls: string[] = [];
      if (Array.isArray(existingImages)) {
        finalImageUrls = [...existingImages, ...newImageUrls];
      } else if (typeof existingImages === 'string' && existingImages) {
        finalImageUrls = [existingImages, ...newImageUrls];
      } else {
        finalImageUrls = [...newImageUrls];
      }

      const existingVideos = fields.existingVideos;
      let finalVideoUrls: string[] = [];
      if (Array.isArray(existingVideos)) {
        finalVideoUrls = [...existingVideos, ...newVideoUrls];
      } else if (typeof existingVideos === 'string' && existingVideos) {
        finalVideoUrls = [existingVideos, ...newVideoUrls];
      } else {
        finalVideoUrls = [...newVideoUrls];
      }

      const price = parseFloat(fields.price);
      const costPrice = parseFloat(fields.costPrice);
      const oldPrice = fields.oldPrice ? parseFloat(fields.oldPrice) : null;

      console.log('PUT: Prices parsed:', { price, costPrice, oldPrice });

      if (!fields.name || isNaN(price) || isNaN(costPrice) || !variants.length) {
        console.log('PUT: Validation failed - missing required fields');
        return res.status(400).json({ 
          message: 'Отсутствуют обязательные поля.',
          details: { name: !!fields.name, price: !isNaN(price), costPrice: !isNaN(costPrice), variantsCount: variants.length }
        });
      }

      console.log('PUT: Starting database transaction...');
      await prisma.$transaction(async (tx) => {
        // Получаем существующие варианты
        const existingDbVariants = await tx.productVariant.findMany({ 
          where: { productId: id } 
        });
        console.log('PUT: Existing variants in DB:', existingDbVariants.length);
        
        const variantsToUpdate = variants.filter((v): v is Required<VariantData> => !!v.id);
        const variantsToCreate = variants.filter((v) => !v.id);
        const variantsToDelete = existingDbVariants.filter(v => 
          !variantsToUpdate.some(uv => uv.id === v.id)
        );

        console.log('PUT: Variant operations:', {
          toUpdate: variantsToUpdate.length,
          toCreate: variantsToCreate.length,
          toDelete: variantsToDelete.length
        });

        // Удаляем неиспользуемые варианты
        if (variantsToDelete.length > 0) {
          await tx.productVariant.deleteMany({ 
            where: { id: { in: variantsToDelete.map(v => v.id) } } 
          });
          console.log('PUT: Deleted variants:', variantsToDelete.length);
        }
        
        // Создаем новые варианты
        if (variantsToCreate.length > 0) {
          await tx.productVariant.createMany({ 
            data: variantsToCreate.map(v => ({ 
              ...v, 
              productId: id,
              color: v.color || null 
            })) 
          });
          console.log('PUT: Created variants:', variantsToCreate.length);
        }
        
        // Обновляем существующие варианты
        if (variantsToUpdate.length > 0) {
          await Promise.all(variantsToUpdate.map(v => 
            tx.productVariant.update({ 
              where: { id: v.id }, 
              data: { 
                color: v.color || null, 
                size: v.size, 
                stock: v.stock 
              } 
            })
          ));
          console.log('PUT: Updated variants:', variantsToUpdate.length);
        }

        // Обновляем продукт
        const updatedProduct = await tx.product.update({
          where: { id },
          data: {
            name: fields.name,
            brand: fields.brand || null,
            description: fields.description || null,
            composition: fields.composition || null,
            careInstructions: fields.careInstructions || null,
            category: categoryEnum,
            season: seasonEnum,
            gender: genderEnum,
            price, 
            oldPrice, 
            costPrice,
            currentPrice: price,
            images: finalImageUrls,
            videos: finalVideoUrls,
          },
        });
        console.log('PUT: Product updated successfully:', updatedProduct.name);
      });

      res.status(200).json({ message: "Product updated successfully" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('PUT: Failed to update product:', error);
      res.status(500).json({ 
        message: 'Failed to update product', 
        error: errorMessage 
      });
    }
    return;
  }
  
  if (req.method === 'DELETE') {
    try {
      console.log('DELETE: Starting deletion for product ID:', id);
      
      // Проверяем существование продукта
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        console.log('DELETE: Product not found:', id);
        return res.status(404).json({ message: 'Product not found for deletion' });
      }

      await prisma.$transaction(async (tx) => {
        console.log('DELETE: Deleting related OrderItems...');
        await tx.orderItem.deleteMany({
          where: {
            OR: [
              { productId: id },
              { productVariant: { productId: id } }
            ]
          }
        });
        
        console.log('DELETE: Deleting related Reviews...');
        await tx.review.deleteMany({
          where: { productId: id }
        });

        console.log('DELETE: Deleting ProductVariants...');
        await tx.productVariant.deleteMany({
          where: { productId: id }
        });

        console.log('DELETE: Deleting Product...');
        await tx.product.delete({ where: { id } });
      });

      console.log('DELETE: Product deleted successfully');
      res.status(204).end();
    } catch (error: unknown) {
      console.error('DELETE: Failed to delete product:', error);
      
      if (error instanceof Error) {
        const prismaError = error as Prisma.PrismaClientKnownRequestError;
        if (prismaError.code === 'P2003') { 
          return res.status(409).json({ 
            message: 'Невозможно удалить товар, так как существуют связанные записи в других таблицах.' 
          });
        }
      }
      
      res.status(500).json({ 
        message: 'Failed to delete product', 
        error: (error instanceof Error) ? error.message : 'Unknown error' 
      });
    }
    return;
  }

  console.log('Method not allowed:', req.method);
  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}