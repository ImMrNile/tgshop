// lib/utils.ts - ИСПРАВЛЕНО
export const generateReferralLink = (userId: string): string => {
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'elitecisbot';
  return `https://t.me/${botUsername}?start=ref_${userId}`;
};

export const generateProductShareLink = (productId: string): string => {
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'elitecisbot';
  return `https://t.me/${botUsername}?start=product_${productId}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback для старых браузеров или небезопасных контекстов
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error('Ошибка копирования в буфер обмена:', error);
    return false;
  }
};

// Интерфейсы для типизации
interface OrderData {
  total?: string | number;
  status?: string;
  referralBonus?: string | number;
}

// Утилиты для расчета статистики пользователя
export const calculateUserStats = (orders: OrderData[]) => {
  const totalSpent = orders.reduce((sum, order) => {
    return sum + parseFloat(String(order.total || 0));
  }, 0);

  const completedOrders = orders.filter(order => order.status === 'COMPLETED').length;
  
  // Расчет потенциальных выплат (например, 5% от суммы заказов рефералов)
  const referralEarnings = orders
    .filter(order => order.referralBonus)
    .reduce((sum, order) => sum + parseFloat(String(order.referralBonus || 0)), 0);

  return {
    totalSpent,
    completedOrders,
    referralEarnings,
    averageOrderValue: completedOrders > 0 ? totalSpent / completedOrders : 0
  };
};

// Форматирование валюты
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Обработка share без дублирования ссылок
export const handleShare = async (title: string, text: string, url: string): Promise<boolean> => {
  const shareData = {
    title,
    text,
    url
  };

  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    } else {
      // Создаем текст без дублирования URL
      const shareText = `${text} ${url}`;
      return await copyToClipboard(shareText);
    }
  } catch (error) {
    console.error('Ошибка при попытке поделиться:', error);
    return await copyToClipboard(`${text} ${url}`);
  }
};