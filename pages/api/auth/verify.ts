// pages/api/auth/verify.ts - ИСПРАВЛЕНО
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Добавляем заголовки для предотвращения кеширования
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Verify endpoint called, checking authorization...');
    
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log('No user found from request');
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Проверяем, является ли пользователь администратором
    const isAdmin = user.telegramId === process.env.ADMIN_TELEGRAM_ID;

    console.log('User verified successfully:', {
      id: user.id,
      telegramId: user.telegramId,
      isAdmin
    });

    res.status(200).json({
      user: {
        ...user,
        isAdmin
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}