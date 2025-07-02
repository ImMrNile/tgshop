// lib/telegram-notifier.ts
import prisma from './prisma'; 
import { Order, User, OrderStatus } from '@prisma/client'; // Keep types, they are used implicitly

// Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN!; 

// Базовый URL вашего мини-приложения
const APP_BASE_URL = process.env.VERCEL_APP_URL || 'https://example.com'; 

interface NotificationOptions {
  parse_mode?: 'Markdown' | 'HTML' | 'MarkdownV2';
  reply_markup?: { 
    inline_keyboard?: { text: string; url?: string; web_app?: { url: string } }[][];
    keyboard?: { text: string }[][];
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    remove_keyboard?: boolean;
    selective?: boolean;
  };
}

/**
 * Отправляет сообщение пользователю Telegram.
 * @param telegramId Идентификатор чата пользователя Telegram.
 * @param message Текст сообщения.
 * @param options Дополнительные параметры уведомления (режим парсинга, клавиатура).
 * @returns true, если сообщение отправлено успешно, иначе false.
 */
export async function sendTelegramNotification(
  telegramId: string,
  message: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения.');
    return false;
  }
  if (!telegramId) {
    console.warn('sendTelegramNotification: telegramId не предоставлен. Сообщение не будет отправлено.');
    return false;
  }

  const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: options?.parse_mode || 'MarkdownV2', 
        reply_markup: options?.reply_markup,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Ошибка отправки сообщения Telegram пользователю ${telegramId}:`, errorData);
      return false;
    } else {
      console.log(`Уведомление Telegram успешно отправлено пользователю ${telegramId}.`);
      return true;
    }
  } catch (error) {
    console.error(`Ошибка при выполнении HTTP-запроса к Telegram API для ${telegramId}:`, error);
    return false;
  }
}

/**
 * Экранирует специальные символы для MarkdownV2.
 * @param text Исходный текст.
 * @returns Экранированный текст.
 */
function escapeMarkdownV2(text: string): string {
  // Список символов, которые нужно экранировать в MarkdownV2
  const charactersToEscape = /([_*\[\]()~`>#+\-=|{}.!])/g;
  return text.replace(charactersToEscape, '\\$1');
}

/**
 * Отправляет уведомление пользователю об изменении статуса его заказа.
 * @param orderId ID заказа.
 * @param newStatus Новый статус заказа.
 */
export async function notifyOrderStatusChange(orderId: string, newStatus: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true } 
  }) as (Order & { user: User }) | null; // Явное приведение типа для полной информации

  if (!order || !order.user || !order.user.telegramId) {
    console.warn(`Заказ ${orderId} или его пользователь не найден, или у пользователя нет telegramId. Уведомление не отправлено.`);
    return;
  }

  let message = `🛍️ \\*Статус вашего заказа №${escapeMarkdownV2(order.id.substring(0, 8).toUpperCase())} изменился\\!\\*`;

  switch (newStatus) {
    case OrderStatus.PENDING:
      message += `\n\nНовый статус: \\*В ожидании подтверждения\\*`;
      message += `\nМы получили ваш заказ и скоро свяжемся с вами\\!`;
      break;
    case OrderStatus.PAID:
      message += `\n\nНовый статус: \\*Оплачен\\*`;
      message += `\nСпасибо за оплату\\! Ваш заказ передан в обработку\\.`;
      break;
    case OrderStatus.PROCESSING:
      message += `\n\nНовый статус: \\*В обработке\\*`;
      message += `\nВаш заказ собирается и готовится к отправке\\.`;
      break;
    case OrderStatus.SHIPPED:
      message += `\n\nНовый статус: \\*Отправлен\\*`;
      message += `\nВаш заказ уже в пути\\!`;
      if (order.trackingNumber) {
        const trackingNumber = escapeMarkdownV2(order.trackingNumber);
        const trackingLink = order.trackingLink ? `[Отслеживание](${escapeMarkdownV2(order.trackingLink)})` : `Трек-номер: \`${trackingNumber}\``;
        message += `\n${trackingLink}`;
      }
      break;
    case OrderStatus.DELIVERED:
      message += `\n\nНовый статус: \\*Доставлен\\*`;
      message += `\nНадеемся, вам всё понравилось\\! Будем рады вашему отзыву\\.`;
      break;
    case OrderStatus.CANCELLED:
      message += `\n\nНовый статус: \\*Отменен\\*`;
      message += `\nВаш заказ был отменен\\. Если у вас есть вопросы, свяжитесь с поддержкой\\.`;
      break;
    case OrderStatus.REFUNDED:
      message += `\n\nНовый статус: \\*Возвращен\\*`;
      message += `\nСредства за ваш заказ были возвращены\\.`;
      break;
    default:
      message += `\n\nНовый статус: \\*${escapeMarkdownV2(newStatus)}\\*`;
      break;
  }
  
  message += `\n\n[Посмотреть детали заказа](${escapeMarkdownV2(`${APP_BASE_URL}/orders/${order.id}`)})`;

  await sendTelegramNotification(order.user.telegramId, message, { parse_mode: 'MarkdownV2' });
}

/**
 * Отправляет уведомление пользователю о новом сообщении от менеджера по заказу.
 * @param orderId ID заказа.
 * @param messageText Текст сообщения от менеджера.
 */
export async function notifyNewManagerMessage(orderId: string, messageText: string) {
    // ИСПРАВЛЕНИЕ: Убедитесь, что order здесь имеет тип Order & { user: User }
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true }
  }) as (Order & { user: User }) | null; // Явное приведение типа

  if (!order || !order.user || !order.user.telegramId) {
    console.warn(`Заказ ${orderId} или его пользователь не найден, или у пользователя нет telegramId. Уведомление не отправлено.`);
    return;
  }

  const message = `💬 \\*Новое сообщение по вашему заказу №${escapeMarkdownV2(order.id.substring(0, 8).toUpperCase())}\\*

Менеджер: _"${escapeMarkdownV2(messageText)}"_

[Перейти к заказу](${escapeMarkdownV2(`${APP_BASE_URL}/orders/${order.id}`)})`;

  await sendTelegramNotification(order.user.telegramId, message, { parse_mode: 'MarkdownV2' });
}

/**
 * Отправляет общее уведомление конкретному пользователю (например, о новой акции).
 * @param userId ID пользователя из вашей БД.
 * @param updateMessage Текст уведомления.
 */
export async function notifyGeneralUpdate(userId: string, updateMessage: string) {
    // ИСПРАВЛЕНИЕ: Убедитесь, что user здесь имеет тип User
  const user = await prisma.user.findUnique({
    where: { id: userId }
  }) as User | null; // Явное приведение типа

  if (!user || !user.telegramId) {
    console.warn(`Пользователь ${userId} не найден или у него нет telegramId. Уведомление не отправлено.`);
    return;
  }

  const message = `📢 \\*Обновление от Hedonist:\\*
${escapeMarkdownV2(updateMessage)}

[Открыть приложение](${escapeMarkdownV2(APP_BASE_URL)})`;

  await sendTelegramNotification(user.telegramId, message, { parse_mode: 'MarkdownV2' });
}