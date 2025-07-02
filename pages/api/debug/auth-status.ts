// pages/api/debug/auth-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);

    const user = await getUserFromRequest(req);
    console.log('User from request:', user);

    const isAdmin = user?.telegramId === process.env.ADMIN_TELEGRAM_ID;

    res.status(200).json({
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader,
      user: user,
      isAdmin: isAdmin,
      adminTelegramId: process.env.ADMIN_TELEGRAM_ID,
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('Debug auth error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
