// pages/api/admin/orders/[id]/comments.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../../../lib/prisma';
import { Role } from '@prisma/client';
import { parseForm } from '../../../../../lib/formParser'; // Используем ваш парсер
import cloudinary from 'cloudinary';
import fs from 'fs';

// Конфигурация Cloudinary (берет ключи из .env)
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Указываем Next.js не парсить тело запроса, так как это будет делать busboy
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id: orderId } = req.query;

  if (typeof orderId !== 'string') {
    return res.status(400).json({ message: 'Отсутствует ID заказа.' });
  }

  try {
    // Парсим multipart/form-data
    const { fields, files } = await parseForm(req);
    const text = fields.text as string || '';
    const commentImages = files.images || [];

    if (text.trim() === '' && commentImages.length === 0) {
      return res.status(400).json({ message: 'Комментарий не может быть пустым.' });
    }

    const uploadedImageUrls: string[] = [];

    // Загружаем каждое изображение в Cloudinary
    for (const file of commentImages) {
      try {
        const result = await cloudinary.v2.uploader.upload(file.filepath, {
          folder: 'elite-app-comments', // Папка в Cloudinary для комментариев
        });
        uploadedImageUrls.push(result.secure_url);
      } catch (uploadError) {
        console.error('Ошибка загрузки фото в Cloudinary:', uploadError);
        // Можно прервать или продолжить без этого фото
      } finally {
        // Удаляем временный файл после загрузки
        fs.unlinkSync(file.filepath);
      }
    }

    // Сохраняем комментарий с URL загруженных изображений
    const comment = await prisma.comment.create({
      data: {
        text,
        imageUrls: uploadedImageUrls,
        orderId,
        authorRole: Role.ADMIN,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error(`Ошибка при добавлении комментария к заказу ${orderId}:`, error);
    res.status(500).json({ message: 'Не удалось добавить комментарий' });
  }
}