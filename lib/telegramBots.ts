// lib/telegramBots.ts
import TelegramBot from 'node-telegram-bot-api';

// Получаем токены из переменных окружения
const USER_BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_TELEGRAM_BOT;
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

// Инициализируем ботов. 'polling: false' нужен для работы в serverless-среде (Next.js API routes).
// Проверяем наличие токенов, чтобы избежать ошибок инициализации, если переменная окружения отсутствует.
export const userBot = USER_BOT_TOKEN
  ? new TelegramBot(USER_BOT_TOKEN, { polling: false })
  : null;

export const adminBot = ADMIN_BOT_TOKEN
  ? new TelegramBot(ADMIN_BOT_TOKEN, { polling: false })
  : null;

/**
 * Отправляет сообщение администратору через админ-бота.
 * @param message Текст сообщения.
 */
export async function sendAdminNotification(message: string): Promise<void> {
  if (adminBot && ADMIN_TELEGRAM_ID) {
    try {
      await adminBot.sendMessage(ADMIN_TELEGRAM_ID, message);
      console.log('Уведомление администратору успешно отправлено.');
    } catch (error) {
      console.error('Не удалось отправить уведомление администратору:', error);
    }
  } else {
    console.warn('Админ-бот или ID администратора Telegram не настроены в переменных окружения.');
  }
}

/**
 * Отправляет сообщение пользователю через пользовательский бот.
 * @param chatId ID чата пользователя.
 * @param message Текст сообщения.
 */
export async function sendUserMessage(chatId: string | number, message: string): Promise<void> {
  if (userBot) {
    try {
      await userBot.sendMessage(chatId, message);
      console.log(`Сообщение пользователю ${chatId} успешно отправлено.`);
    } catch (error) {
      console.error(`Не удалось отправить сообщение пользователю ${chatId}:`, error);
    }
  } else {
    console.warn('Пользовательский бот не настроен в переменных окружения.');
  }
}