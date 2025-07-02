// types/telegram.ts - ОБНОВЛЕНО
export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    chat_instance?: string;
    chat_type?: string;
    auth_date?: number;
    hash?: string;
  };
  ready(): void;
  close(): void;
  expand(): void;
  openTelegramLink?(url: string): void;
  openLink?(url: string, options?: { try_instant_view?: boolean }): void;
  version?: string;  // Добавляем опциональные свойства
  platform?: string;
  colorScheme?: string;
  themeParams?: Record<string, any>;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;

  // ДОБАВЛЕНО: Метод для Telegram Stars Payment
  openInvoice?(url: string, callback?: (status: string) => void): void; // Теперь openInvoice существует

  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  BackButton: {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}