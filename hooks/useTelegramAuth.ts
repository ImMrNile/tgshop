// hooks/useTelegramAuth.ts - Улучшенная версия с детальной отладкой
import { useEffect, useState } from 'react';
import { TelegramUser, TelegramWebApp } from '../types/telegram';

export const useTelegramAuth = () => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    console.log(logMessage);
    setDebugInfo(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    const initTelegramAuth = async () => {
      try {
        addDebugLog('Начинаем инициализацию Telegram Auth');
        
        // Проверяем наличие Telegram WebApp
        const hasTelegramWebApp = !!(window as any).Telegram?.WebApp;
        addDebugLog(`Telegram WebApp доступен: ${hasTelegramWebApp}`);
        
        if (hasTelegramWebApp) {
          const tg = (window as any).Telegram.WebApp as TelegramWebApp;
          
          addDebugLog(`WebApp version: ${(tg as any).version || 'неизвестно'}`);
          addDebugLog(`WebApp platform: ${(tg as any).platform || 'неизвестно'}`);
          addDebugLog(`initData length: ${tg.initData?.length || 0}`);
          
          // Инициализируем WebApp
          tg.ready();
          tg.expand();
          addDebugLog('WebApp ready() и expand() выполнены');

          // Получаем данные пользователя
          const telegramUser = tg.initDataUnsafe.user;
          addDebugLog(`initDataUnsafe.user: ${JSON.stringify(telegramUser)}`);
          
          if (telegramUser && telegramUser.id) {
            addDebugLog(`Пользователь найден: ID ${telegramUser.id}`);
            setUser(telegramUser);
            
            // Автоматически авторизуем пользователя
            addDebugLog('Отправляем запрос на авторизацию');
            const authResponse = await fetch('/api/auth/telegram-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                telegramId: telegramUser.id.toString(),
                username: telegramUser.username || null,
                firstName: telegramUser.first_name || null,
                lastName: telegramUser.last_name || null,
                initData: tg.initData, // Для верификации
              }),
            });

            addDebugLog(`Ответ авторизации: ${authResponse.status}`);
            
            if (authResponse.ok) {
              const authData = await authResponse.json();
              addDebugLog('Авторизация успешна');
              
              // Сохраняем токен
              localStorage.setItem('authToken', authData.token);
              localStorage.setItem('userData', JSON.stringify(authData.user));
              
              setIsAuthenticated(true);
              addDebugLog('Токен сохранен, пользователь авторизован');
            } else {
              const errorData = await authResponse.json();
              addDebugLog(`Ошибка авторизации: ${errorData.message}`);
              throw new Error(errorData.message || 'Ошибка авторизации');
            }
          } else {
            addDebugLog('Данные пользователя не найдены в initDataUnsafe');
            
            // Проверяем, что вообще есть в initData
            addDebugLog(`Полный initDataUnsafe: ${JSON.stringify(tg.initDataUnsafe)}`);
            
            // Если нет данных пользователя, но есть initData, попробуем парсить
            if (tg.initData && tg.initData.length > 0) {
              addDebugLog('Попытка парсинга initData напрямую');
              
              // Простой парсинг для отладки
              const params = new URLSearchParams(tg.initData);
              const userParam = params.get('user');
              
              if (userParam) {
                try {
                  const parsedUser = JSON.parse(decodeURIComponent(userParam));
                  addDebugLog(`Пользователь найден через парсинг: ${JSON.stringify(parsedUser)}`);
                  setUser(parsedUser);
                  
                  // Повторяем авторизацию
                  const authResponse = await fetch('/api/auth/telegram-login', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      telegramId: parsedUser.id.toString(),
                      username: parsedUser.username || null,
                      firstName: parsedUser.first_name || null,
                      lastName: parsedUser.last_name || null,
                      initData: tg.initData,
                    }),
                  });

                  if (authResponse.ok) {
                    const authData = await authResponse.json();
                    localStorage.setItem('authToken', authData.token);
                    localStorage.setItem('userData', JSON.stringify(authData.user));
                    setIsAuthenticated(true);
                    addDebugLog('Авторизация через парсинг успешна');
                  }
                } catch (parseError) {
                  addDebugLog(`Ошибка парсинга user параметра: ${parseError}`);
                }
              } else {
                addDebugLog('Параметр user не найден в initData');
              }
            } else {
              addDebugLog('initData пустой или отсутствует');
              throw new Error('Данные пользователя Telegram не найдены');
            }
          }
        } else {
          addDebugLog('Telegram WebApp не найден');
          
          // Для разработки - используем тестовые данные
          if (process.env.NODE_ENV === 'development') {
            addDebugLog('Development режим - используем тестовые данные');
            
            const testUser: TelegramUser = {
              id: 123456789,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser',
            };
            
            setUser(testUser);
            
            // Авторизуем тестового пользователя
            const authResponse = await fetch('/api/auth/telegram-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                telegramId: testUser.id.toString(),
                username: testUser.username,
                firstName: testUser.first_name,
                lastName: testUser.last_name,
                initData: 'test_data',
              }),
            });

            if (authResponse.ok) {
              const authData = await authResponse.json();
              localStorage.setItem('authToken', authData.token);
              localStorage.setItem('userData', JSON.stringify(authData.user));
              setIsAuthenticated(true);
              addDebugLog('Тестовая авторизация успешна');
            }
          } else {
            throw new Error('Приложение должно запускаться в Telegram');
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
        addDebugLog(`Ошибка инициализации: ${errorMessage}`);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        addDebugLog('Инициализация завершена');
      }
    };

    initTelegramAuth();
  }, []);

  const logout = () => {
    addDebugLog('Выполняем logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setIsAuthenticated(false);
    
    // Закрываем WebApp
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.close();
    }
  };

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    logout,
    debugInfo, // Добавляем логи для отладки
    telegramWebApp: typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null,
  };
};