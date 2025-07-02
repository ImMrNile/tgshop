// pages/debug-auth.tsx - Исправлено без ESLint ошибок
import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';

interface TelegramDebugInfo {
  hasTelegram: boolean;
  hasWebApp: boolean;
  webAppData: {
    initData?: string;
    initDataUnsafe?: {
      user?: {
        id: number;
        first_name?: string;
        last_name?: string;
        username?: string;
      };
      [key: string]: unknown;
    };
    version?: string;
    platform?: string;
    colorScheme?: string;
    themeParams?: Record<string, unknown>;
    isExpanded?: boolean;
    viewportHeight?: number;
    viewportStableHeight?: number;
  } | null;
  parsedInitData: Record<string, unknown> | null;
  userAgent: string;
  location: string;
  localStorage: {
    authToken: string | null;
    userData: string | null;
  };
}

export default function DebugAuthPage() {
  const { user, isLoading, error, isAuthenticated } = useAuth();
  const [telegramDebugInfo, setTelegramDebugInfo] = useState<TelegramDebugInfo | null>(null);

  useEffect(() => {
    // Собираем всю доступную информацию о Telegram WebApp
    const telegram = (window as { Telegram?: { WebApp?: Record<string, unknown> } }).Telegram;
    
    const debugInfo: TelegramDebugInfo = {
      // Основная информация
      hasTelegram: !!telegram,
      hasWebApp: !!telegram?.WebApp,
      
      // Данные WebApp (если доступны)
      webAppData: telegram?.WebApp ? {
        initData: telegram.WebApp.initData as string,
        initDataUnsafe: telegram.WebApp.initDataUnsafe as {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
          [key: string]: unknown;
        },
        version: telegram.WebApp.version as string,
        platform: telegram.WebApp.platform as string,
        colorScheme: telegram.WebApp.colorScheme as string,
        themeParams: telegram.WebApp.themeParams as Record<string, unknown>,
        isExpanded: telegram.WebApp.isExpanded as boolean,
        viewportHeight: telegram.WebApp.viewportHeight as number,
        viewportStableHeight: telegram.WebApp.viewportStableHeight as number,
      } : null,
      
      // Парсинг initData
      parsedInitData: null,
      
      // Информация об окружении
      userAgent: navigator.userAgent,
      location: window.location.href,
      localStorage: {
        authToken: localStorage.getItem('authToken'),
        userData: localStorage.getItem('userData'),
      },
    };

    // Пытаемся распарсить initData
    if (telegram?.WebApp?.initData) {
      try {
        const params = new URLSearchParams(telegram.WebApp.initData as string);
        const parsed: Record<string, unknown> = {};
        
        // Используем forEach вместо for...of для совместимости
        params.forEach((value, key) => {
          if (key === 'user' || key === 'chat') {
            try {
              parsed[key] = JSON.parse(decodeURIComponent(value));
            } catch {
              parsed[key] = value;
            }
          } else {
            parsed[key] = value;
          }
        });
        
        debugInfo.parsedInitData = parsed;
      } catch {
        debugInfo.parsedInitData = { error: 'Ошибка парсинга' };
      }
    }

    setTelegramDebugInfo(debugInfo);
  }, []);

  const testManualAuth = async (): Promise<void> => {
    const telegramId = prompt('Введите ваш Telegram ID (или оставьте пустым для тестового):') || '123456789';
    
    try {
      const response = await fetch('/api/auth/telegram-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          initData: 'manual_test_data',
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        alert('Авторизация успешна! Перезагрузите страницу.');
        window.location.reload();
      } else {
        alert('Ошибка авторизации: ' + (data.message || 'Неизвестная ошибка'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      alert('Ошибка запроса: ' + errorMessage);
    }
  };

  const testRealTelegramAuth = async (): Promise<void> => {
    const telegram = (window as { Telegram?: { WebApp?: Record<string, unknown> } }).Telegram;
    
    if (!telegram?.WebApp) {
      alert('Telegram WebApp не найден! Убедитесь, что открываете через Telegram бота.');
      return;
    }

    const webApp = telegram.WebApp;
    
    // Пытаемся получить данные пользователя разными способами
    let userData: { id: number; username?: string; first_name?: string; last_name?: string } | null = null;
    
    // Способ 1: через initDataUnsafe.user
    const initDataUnsafe = webApp.initDataUnsafe as { user?: { id: number; username?: string; first_name?: string; last_name?: string } };
    if (initDataUnsafe?.user) {
      userData = initDataUnsafe.user;
      console.log('Данные получены через initDataUnsafe.user:', userData);
    }
    
    // Способ 2: парсинг initData
    if (!userData && webApp.initData) {
      try {
        const params = new URLSearchParams(webApp.initData as string);
        const userParam = params.get('user');
        if (userParam) {
          userData = JSON.parse(decodeURIComponent(userParam));
          console.log('Данные получены через парсинг initData:', userData);
        }
      } catch (parseError) {
        console.error('Ошибка парсинга initData:', parseError);
      }
    }
    
    if (!userData) {
      alert('Данные пользователя не найдены в Telegram WebApp');
      return;
    }

    try {
      const response = await fetch('/api/auth/telegram-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: userData.id.toString(),
          username: userData.username || null,
          firstName: userData.first_name || null,
          lastName: userData.last_name || null,
          initData: webApp.initData,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));
        alert('Авторизация через Telegram успешна!');
        window.location.reload();
      } else {
        alert('Ошибка авторизации: ' + (data.message || 'Неизвестная ошибка'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      alert('Ошибка запроса: ' + errorMessage);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '14px' }}>
      <h1>Отладка Telegram WebApp авторизации</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testRealTelegramAuth} style={{ marginRight: '10px', padding: '10px', backgroundColor: '#0088cc', color: 'white', border: 'none', borderRadius: '4px' }}>
          Авторизация через Telegram WebApp
        </button>
        <button onClick={testManualAuth} style={{ padding: '10px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '4px' }}>
          Ручная авторизация
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
        <h2>Состояние авторизации:</h2>
        <ul>
          <li><strong>isLoading:</strong> {isLoading.toString()}</li>
          <li><strong>isAuthenticated:</strong> {isAuthenticated.toString()}</li>
          <li><strong>error:</strong> {error || 'нет'}</li>
          <li><strong>user:</strong> {user ? JSON.stringify(user, null, 2) : 'null'}</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <h2>Telegram WebApp информация:</h2>
        <div style={{ fontSize: '12px' }}>
          <p><strong>Telegram объект доступен:</strong> {telegramDebugInfo?.hasTelegram ? '✅ Да' : '❌ Нет'}</p>
          <p><strong>WebApp доступен:</strong> {telegramDebugInfo?.hasWebApp ? '✅ Да' : '❌ Нет'}</p>
          
          {telegramDebugInfo?.webAppData && (
            <>
              <p><strong>Версия WebApp:</strong> {telegramDebugInfo.webAppData.version}</p>
              <p><strong>Платформа:</strong> {telegramDebugInfo.webAppData.platform}</p>
              <p><strong>initData длина:</strong> {telegramDebugInfo.webAppData.initData?.length || 0}</p>
              <p><strong>Пользователь в initDataUnsafe:</strong> {telegramDebugInfo.webAppData.initDataUnsafe?.user ? '✅ Есть' : '❌ Нет'}</p>
            </>
          )}
        </div>
      </div>

      {telegramDebugInfo?.parsedInitData && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '4px' }}>
          <h2>Распарсенные данные initData:</h2>
          <pre style={{ background: '#f8f9fa', padding: '10px', overflow: 'auto', fontSize: '11px' }}>
            {JSON.stringify(telegramDebugInfo.parsedInitData, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
        <h2>Полная информация WebApp:</h2>
        <pre style={{ background: '#f8f9fa', padding: '10px', overflow: 'auto', fontSize: '11px', maxHeight: '300px' }}>
          {JSON.stringify(telegramDebugInfo, null, 2)}
        </pre>
      </div>

      <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
        <h2>Инструкции:</h2>
        <ol>
          <li><strong>Если &quot;Telegram объект&quot; = ❌:</strong> Убедитесь, что открываете через кнопку в Telegram боте</li>
          <li><strong>Если &quot;WebApp доступен&quot; = ❌:</strong> Проверьте настройки бота в @BotFather</li>
          <li><strong>Если &quot;Пользователь в initDataUnsafe&quot; = ❌:</strong> Попробуйте кнопку &quot;Авторизация через Telegram WebApp&quot;</li>
          <li><strong>Если ничего не помогает:</strong> Используйте &quot;Ручная авторизация&quot; с вашим Telegram ID</li>
        </ol>
        
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
          <p><strong>Ваш Telegram ID (если вы админ):</strong> 2138182633</p>
          <p><strong>URL приложения:</strong> https://eliteapp-taupe.vercel.app</p>
          <p><strong>Админ ID из переменных:</strong> {process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID}</p>
        </div>
      </div>
    </div>
  );
}