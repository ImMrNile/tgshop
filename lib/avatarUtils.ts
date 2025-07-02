// lib/avatarUtils.ts
// Утилита для генерации эмодзи-аватаров на основе данных пользователя

interface EmojiAvatar {
  emoji: string;
  backgroundColor: string;
}

// Список эмодзи для выбора (можно расширить)
const emojis = ['😊', '😎', '🤩', '🚀', '🌟', '💡', '🔥', '🌈', '💎', '👑', '🤖', '🦊', '🐻', '🐼', '🐯', '🦁', '🦉', '🦄', '🐲', '🐙'];

// Цветовая палитра для фона аватара
const colors = [
  '#8a2be2', // Фиолетовый
  '#1e90ff', // Синий
  '#10b981', // Зеленый
  '#f59e0b', // Оранжевый
  '#ef4444', // Красный
  '#6b7280', // Серый
  '#00bcd4', // Голубой
  '#ffc107', // Желтый
  '#9c27b0', // Пурпурный
  '#009688', // Бирюзовый
];

/**
 * Генерирует эмодзи-аватар и цвет фона на основе ID пользователя.
 * @param userId ID пользователя (строка).
 * @param name Имя пользователя (для выбора эмодзи по первой букве, если доступно).
 * @returns Объект с эмодзи и цветом фона.
 */
export function generateEmojiAvatar(userId: string, name: string | null | undefined): EmojiAvatar {
  let seed = 0;
  if (name && name.length > 0) {
    seed = name.charCodeAt(0); // Используем ASCII-код первой буквы как часть seed
  } else {
    // Если имени нет, используем хэш от userId
    for (let i = 0; i < userId.length; i++) {
      seed += userId.charCodeAt(i);
    }
  }

  const emojiIndex = seed % emojis.length;
  const colorIndex = (seed + userId.length) % colors.length; // Добавляем userId.length для большего разнообразия

  return {
    emoji: emojis[emojiIndex],
    backgroundColor: colors[colorIndex],
  };
}