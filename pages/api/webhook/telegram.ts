// pages/api/webhook/telegram.ts - Webhook для Elite Market бота
import { NextApiRequest, NextApiResponse } from 'next';
import { userBot } from '../../../lib/telegramBots';

// Типы для Telegram API
interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// Конфигурация - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ
const WEBAPP_URL = 'https://eliteapp-taupe.vercel.app'; // Ваш домен
const CHANNEL_USERNAME = '@your_elite_channel'; // Ваш канал Elite Market
const CHANNEL_LINK = 'https://t.me/your_elite_channel'; // Ссылка на канал

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!userBot) {
    console.error('Elite Market bot not configured');
    return res.status(500).json({ message: 'Bot not configured' });
  }

  try {
    const update: TelegramUpdate = req.body;
    console.log('Elite Market bot received update:', JSON.stringify(update, null, 2));

    // Обработка сообщений
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text;

      console.log(`Elite Market: Message from ${userId}: ${text}`);

      // Обработка команды /start
      if (text === '/start') {
        await handleStartCommand(chatId, message.from);
      }
    }

    // Обработка callback query (нажатия на inline кнопки)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      await handleCallbackQuery(callbackQuery);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Elite Market webhook error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleStartCommand(chatId: number, user: TelegramUser) {
  try {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const username = user.username || '';
    const fullName = `${firstName} ${lastName}`.trim() || username || 'Пользователь';

    console.log(`Elite Market: Sending welcome message to ${fullName} (${chatId})`);

    // Создаем или обновляем пользователя в базе данных
    try {
      await fetch(`${WEBAPP_URL}/api/auth/telegram-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: user.id.toString(),
          username: username,
          firstName: firstName,
          lastName: lastName,
          initData: 'bot_start'
        }),
      });
    } catch (dbError) {
      console.error('Error saving user to database:', dbError);
      // Продолжаем даже если не удалось сохранить в БД
    }

    // Отправляем приветственное сообщение с inline кнопками
    const welcomeMessage = `Добро пожаловать в Elite Market! 🛍️

Премиум интернет-магазин эксклюзивной одежды, обуви и аксессуаров от ведущих мировых брендов.

Откройте для себя мир стиля и качества!

Готовы начать покупки? Поехали!`;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🛍️ Открыть Elite Market',
            web_app: { url: WEBAPP_URL }
          }
        ],
        [
          {
            text: '📢 Вступайте в сообщество Elite Market',
            url: CHANNEL_LINK
          }
        ]
      ]
    };

    if (!userBot) {
      throw new Error('Bot not configured');
    }

    await userBot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });

    console.log(`Elite Market: Welcome message sent to ${chatId}`);

  } catch (error) {
    console.error('Elite Market: Error handling start command:', error);
    
    // Отправляем простое сообщение в случае ошибки
    try {
      if (!userBot) {
        throw new Error('Bot not configured');
      }
      await userBot.sendMessage(chatId, 'Добро пожаловать в Elite Market! Произошла ошибка, попробуйте позже.');
    } catch (fallbackError) {
      console.error('Elite Market: Fallback message failed:', fallbackError);
    }
  }
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery) {
  try {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    console.log(`Elite Market: Callback from ${userId}: ${data}`);

    if (!userBot) {
      throw new Error('Bot not configured');
    }

    // Подтверждаем получение callback
    await userBot.answerCallbackQuery(callbackQuery.id);

    switch (data) {
      case 'open_app':
        // Пользователь нажал "Открыть Elite Market"
        await userBot!.answerCallbackQuery(callbackQuery.id, {
          text: 'Открываем Elite Market... 🛍️',
          show_alert: false
        });
        break;

      case 'join_channel':
        // Пользователь нажал "Вступайте в сообщество"
        await userBot!.answerCallbackQuery(callbackQuery.id, {
          text: 'Переходим в наш канал! 📢',
          show_alert: false
        });
        break;

      case 'check_subscription':
        // Проверяем подписку на канал
        await checkUserSubscription(chatId, userId, callbackQuery.id);
        break;

      default:
        console.log(`Elite Market: Unknown callback data: ${data}`);
    }

  } catch (error) {
    console.error('Elite Market: Error handling callback query:', error);
  }
}

async function checkUserSubscription(chatId: number, userId: number, callbackQueryId: string) {
  try {
    if (!userBot) {
      throw new Error('Bot not configured');
    }

    // Проверяем, подписан ли пользователь на канал
    const chatMember = await userBot.getChatMember(CHANNEL_USERNAME, userId);
    const subscribedStatuses = ['member', 'administrator', 'creator'];
    const isSubscribed = subscribedStatuses.includes(chatMember.status);

    if (isSubscribed) {
      await userBot.answerCallbackQuery(callbackQueryId, {
        text: '✅ Отлично! Вы подписаны на канал. Добро пожаловать в Elite Market!',
        show_alert: true
      });

      // Отправляем сообщение с кнопкой для открытия приложения
      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '🛍️ Открыть Elite Market',
              web_app: { url: WEBAPP_URL }
            }
          ]
        ]
      };

      await userBot.sendMessage(chatId, 
        '🎉 Поздравляем! Теперь у вас есть доступ к Elite Market!\n\nОткройте каталог премиум одежды, обуви и аксессуаров:', 
        { reply_markup: keyboard }
      );

    } else {
      await userBot.answerCallbackQuery(callbackQueryId, {
        text: '❌ Пожалуйста, сначала подпишитесь на наш канал для получения доступа',
        show_alert: true
      });
    }

  } catch (error) {
    console.error('Elite Market: Error checking subscription:', error);
    
    if (!userBot) {
      return;
    }
    
    await userBot.answerCallbackQuery(callbackQueryId, {
      text: '❌ Ошибка проверки подписки. Попробуйте позже.',
      show_alert: true
    });
  }
}

// Функция для настройки webhook (вызывайте один раз для настройки)
export async function setupWebhook() {
  if (!userBot) {
    throw new Error('Elite Market bot not configured');
  }

  const webhookUrl = `${WEBAPP_URL}/api/webhook/telegram`;
  
  try {
    await userBot.setWebHook(webhookUrl);
    console.log(`Elite Market bot webhook set to: ${webhookUrl}`);
    return { success: true, url: webhookUrl };
  } catch (error) {
    console.error('Elite Market: Error setting webhook:', error);
    throw error;
  }
}