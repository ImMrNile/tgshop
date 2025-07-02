// pages/api/user/payout-request.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
// Импортируем типы из Prisma client для строгой типизации
import { User, PayoutRequest } from '@prisma/client'; 
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID!; // Получаем chat_id админа
const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN!; 
const JWT_SECRET = process.env.JWT_SECRET!;
const MIN_PAYOUT_AMOUNT = 1000; // Минимальная сумма для выплаты

// Определяем интерфейс для полезной нагрузки JWT
interface JwtPayload {
  userId: string; // Предполагаем, что userId является строкой
  // Добавьте другие поля, если они присутствуют в вашем токене
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleCreatePayoutRequest(req, res);
  } else if (req.method === 'GET') {
    return handleGetPayoutRequests(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

// Создание запроса на выплату
async function handleCreatePayoutRequest(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    // ИСПРАВЛЕНИЕ: Приводим тип к JwtPayload
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload; 
    const userId = decoded.userId;

    const { cardNumber, cardHolderName, bankName } = req.body;

    // Валидация данных
    if (!cardNumber || !cardHolderName || !bankName) {
      return res.status(400).json({ 
        message: 'Все поля обязательны для заполнения' 
      });
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const availableBalance = Number(user.availableBalance);

    // Проверяем минимальную сумму
    if (availableBalance < MIN_PAYOUT_AMOUNT) {
      return res.status(400).json({ 
        message: `Минимальная сумма для выплаты: ${MIN_PAYOUT_AMOUNT} ₽` 
      });
    }

    // Проверяем, нет ли активных запросов
    const activeRequest = await prisma.payoutRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    if (activeRequest) {
      return res.status(400).json({ 
        message: 'У вас уже есть активный запрос на выплату' 
      });
    }

    // Создаем запрос на выплату
    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        userId,
        amount: availableBalance,
        cardNumber: cardNumber.replace(/\s/g, ''), // Убираем пробелы
        cardHolderName,
        bankName,
        status: 'PENDING'
      }
    });

    // Отправляем уведомление админу
    await sendPayoutNotificationToAdmin(user, payoutRequest);

    res.status(201).json({ 
      message: 'Запрос на выплату создан успешно',
      request: {
        id: payoutRequest.id,
        amount: Number(payoutRequest.amount),
        status: payoutRequest.status,
        requestedAt: payoutRequest.requestedAt
      }
    });

  } catch (error) {
    console.error('Error creating payout request:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}

// Получение истории запросов на выплату
async function handleGetPayoutRequests(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    // ИСПРАВЛЕНИЕ: Приводим тип к JwtPayload
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload; 
    const userId = decoded.userId;

    const requests = await prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' }
    });

    const formattedRequests = requests.map(request => ({
      id: request.id,
      amount: Number(request.amount),
      status: request.status,
      requestedAt: request.requestedAt,
      processedAt: request.processedAt,
      adminComment: request.adminComment
    }));

    res.status(200).json(formattedRequests);

  } catch (error) {
    console.error('Error fetching payout requests:', error);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
}

// Функция отправки уведомления админу
async function sendPayoutNotificationToAdmin(user: User, payoutRequest: PayoutRequest) {
  try {
    // const adminUsername = process.env.MANAGER_USERNAME || 'admin'; // Это можно оставить для логов/отладки

    const message = `🔔 *НОВЫЙ ЗАПРОС НА ВЫПЛАТУ*

👤 *Пользователь:* ${user.firstName || ''} ${user.lastName || ''}
📞 *Telegram:* @${user.username || user.telegramId}
💰 *Сумма:* ${Number(payoutRequest.amount).toLocaleString()} ₽

💳 *ДАННЫЕ ДЛЯ ПЕРЕВОДА:*
Номер карты: \`${payoutRequest.cardNumber}\`
Держатель: ${payoutRequest.cardHolderName}
Банк: ${payoutRequest.bankName}

🆔 *ID запроса:* \`${payoutRequest.id}\`
📅 *Дата:* ${new Date().toLocaleString('ru-RU')}

⚠️ _Требует обработки в течение 24 часов_`;

    // Отправка сообщения админу через Telegram Bot API
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: ADMIN_TELEGRAM_ID, // Используем chat_id админа
            text: message,
            parse_mode: 'MarkdownV2', // Важно для корректного форматирования Markdown
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send Telegram notification:', errorData);
    } else {
        console.log('Telegram notification sent successfully to admin!');
    }

  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}