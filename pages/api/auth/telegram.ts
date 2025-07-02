// pages/api/auth/telegram.ts
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../../lib/prisma';

const BOT_TOKEN = process.env.BOT_TOKEN!;
const JWT_SECRET = process.env.JWT_SECRET!;
// NEW: Import ADMIN_TELEGRAM_ID from env
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID!; 

// ... (остальные интерфейсы и хелперы)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ message: 'initData is required' });
  }

  if (!BOT_TOKEN || !JWT_SECRET || !ADMIN_TELEGRAM_ID) { // Add ADMIN_TELEGRAM_ID check
    console.error('Missing environment variables: BOT_TOKEN, JWT_SECRET, or ADMIN_TELEGRAM_ID');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    // ... (логика проверки initData) ...

    const telegramUser = parsedInitData.user;
    if (!telegramUser || !telegramUser.id) {
      return res.status(400).json({ message: 'User data not found in initData' });
    }

    const userId = String(telegramUser.id);
    const referralCodeFromDeepLink = parsedInitData.start_param; 

    let existingUser = await prisma.user.findUnique({
      where: { telegramId: userId },
    });

    let referrerId: string | undefined = undefined;
    if (!existingUser && referralCodeFromDeepLink) {
        const referrer = await prisma.user.findUnique({
            where: { referralCode: referralCodeFromDeepLink }
        });
        if (referrer) {
            referrerId = referrer.id;
        }
    }

    const user = await prisma.user.upsert({
      where: { telegramId: userId },
      update: {
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || null,
        lastName: telegramUser.last_name || null,
        languageCode: telegramUser.language_code || null,
      },
      create: {
        telegramId: userId,
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || null,
        lastName: telegramUser.last_name || null,
        languageCode: telegramUser.language_code || null,
        referralCode: crypto.randomBytes(4).toString('hex'), 
        referredById: referrerId, 
      },
    });

    // Determine isAdmin based on ADMIN_TELEGRAM_ID from .env
    const userIsAdmin = user.telegramId === ADMIN_TELEGRAM_ID;

    // Генерация JWT токена
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId, isAdmin: userIsAdmin }, // Используем userIsAdmin
      JWT_SECRET,
      { expiresIn: '7d' } 
    );

    res.status(200).json({ token, user });

  } catch (error: unknown) {
    console.error('Error in /api/auth/telegram:', error);
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid JWT secret or token format' });
    }
    return res.status(500).json({ message: 'Internal server error during authentication' });
  }
}