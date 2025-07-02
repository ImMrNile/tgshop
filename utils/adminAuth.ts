// utils/adminAuth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromRequest } from '../lib/auth';

// Список разрешенных admin Telegram ID
const ADMIN_TELEGRAM_IDS = [
  process.env.ADMIN_TELEGRAM_ID || '2138182633',
  // Можно добавить дополнительных админов
];

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    telegramId: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
}

export function withAdminAuth(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Получаем пользователя из токена
      const user = await getUserFromRequest(req);
      
      if (!user) {
        return res.status(401).json({ message: 'Токен авторизации не предоставлен или недействителен' });
      }
      
      // Проверяем, является ли пользователь админом
      if (!ADMIN_TELEGRAM_IDS.includes(user.telegramId)) {
        console.log(`Доступ запрещен для пользователя: ${user.telegramId}. Разрешенные админы: ${ADMIN_TELEGRAM_IDS.join(', ')}`);
        return res.status(403).json({ 
          message: 'Доступ запрещен. Недостаточно прав.',
          userTelegramId: user.telegramId,
          allowedAdmins: ADMIN_TELEGRAM_IDS
        });
      }

      // Добавляем пользователя в объект запроса
      (req as AuthenticatedRequest).user = user;
      
      // Вызываем обработчик
      return handler(req as AuthenticatedRequest, res);
    } catch (error) {
      console.error('Admin auth error:', error);
      return res.status(401).json({ message: 'Ошибка авторизации' });
    }
  };
}

// Функция для проверки админ-прав
export function checkAdminAccess(telegramId: string): boolean {
  return ADMIN_TELEGRAM_IDS.includes(telegramId);
}

// Функция для получения списка админов
export function getAdminList(): string[] {
  return ADMIN_TELEGRAM_IDS;
}