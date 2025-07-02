// pages/api/setup-webhook.ts - Настройка webhook для Elite Market бота
import { NextApiRequest, NextApiResponse } from 'next';
import { userBot } from '../../lib/telegramBots';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Проверяем, что это POST запрос и есть секретный ключ для безопасности
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Простая защита - можете заменить на более сложную
  const secretKey = req.headers['x-setup-key'];
  if (secretKey !== process.env.WEBHOOK_SETUP_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!userBot) {
    return res.status(500).json({ message: 'Elite Market bot not configured' });
  }

  try {
    const webhookUrl = `${process.env.NEXTAUTH_URL || 'https://eliteapp-taupe.vercel.app'}/api/webhook/telegram`;

    console.log(`Setting up Elite Market bot webhook: ${webhookUrl}`);

    // Удаляем старый webhook (если есть)
    await userBot.deleteWebHook();

    // Устанавливаем новый webhook
    await userBot.setWebHook(webhookUrl, {
      allowed_updates: ['message', 'callback_query'] // Только нужные типы обновлений
    });

    // Проверяем, что webhook установлен
    const webhookInfo = await userBot.getWebHookInfo();

    console.log('Elite Market webhook info:', webhookInfo);

    res.status(200).json({
      success: true,
      message: 'Elite Market bot webhook configured successfully',
      webhookInfo: {
        url: webhookInfo.url,
        has_custom_certificate: webhookInfo.has_custom_certificate,
        pending_update_count: webhookInfo.pending_update_count,
        last_error_date: webhookInfo.last_error_date,
        last_error_message: webhookInfo.last_error_message,
        max_connections: webhookInfo.max_connections,
        allowed_updates: webhookInfo.allowed_updates
      }
    });

  } catch (error) {
    console.error('Elite Market webhook setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup webhook',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Экспортируем также функцию для программной настройки
export async function setupEliteMarketWebhook() {
  if (!userBot) {
    throw new Error('Elite Market bot not configured');
  }

  const webhookUrl = `${process.env.NEXTAUTH_URL || 'https://eliteapp-taupe.vercel.app'}/api/webhook/telegram`;

  try {
    // Удаляем старый webhook
    await userBot.deleteWebHook();

    // Устанавливаем новый
    await userBot.setWebHook(webhookUrl, {
      allowed_updates: ['message', 'callback_query']
    });

    console.log(`Elite Market bot webhook configured: ${webhookUrl}`);
    return { success: true, url: webhookUrl };

  } catch (error) {
    console.error('Elite Market webhook setup failed:', error);
    throw error;
  }
}