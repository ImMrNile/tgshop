// pages/api/admin/check-auth.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // В реальном приложении здесь будет сложная логика проверки токена/сессии.
  // Для нашего прототипа: если ADMIN_TELEGRAM_ID установлен, считаем, что "возможно" авторизованы.
  // Это очень небезопасно для продакшена!
  if (process.env.ADMIN_TELEGRAM_ID) {
    res.status(200).json({ authorized: true });
  } else {
    res.status(401).json({ authorized: false, message: 'Unauthorized: ADMIN_TELEGRAM_ID not set' });
  }
}