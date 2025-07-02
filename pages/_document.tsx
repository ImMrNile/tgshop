// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import '../styles/globals.css';
// Предположим, у вас есть AppProvider и AuthProvider
import { AppProvider } from '../contexts/AppContext';
import { AuthProvider } from '../components/AuthProvider';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        // ... другие свойства WebApp
      };
    };
  }
}

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Проверяем, запущено ли приложение внутри Telegram Web App
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const webApp = window.Telegram.WebApp;
      // Инициализируем Web App (это обязательно)
      webApp.ready();
      // Можно также закрыть Web App, если нет токена и пользователь не авторизован
      // webApp.onEvent('main_button_pressed', () => { /* ... */ });

      const initData = webApp.initData;

      // Отправляем initData на наш сервер для проверки и получения JWT
      const authenticateUser = async () => {
        try {
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ initData }),
          });

          if (res.ok) {
            const { token, user } = await res.json();
            localStorage.setItem('authToken', token);
            localStorage.setItem('userData', JSON.stringify(user));
            // Если AuthProvider использует localStorage, он автоматически подхватит
            // Если нет, возможно, придется обновить состояние AuthProvider вручную.
            console.log('User authenticated successfully, token saved.');
          } else {
            const errorData = await res.json();
            console.error('Authentication failed:', errorData.message);
            // Очистить недействительные токены, если они есть
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            // Возможно, показать сообщение пользователю
          }
        } catch (error) {
          console.error('Error during Telegram Web App authentication:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      };

      // Выполняем авторизацию при запуске приложения
      authenticateUser();
    } else {
      // Если приложение запущено не в Telegram Web App (например, напрямую в браузере)
      console.log('Not running in Telegram Web App environment.');
      // Здесь можно добавить логику для дебага или для обычного веб-приложения
      // Например, перенаправление на страницу входа или показ сообщения
    }
  }, []); // Запускаем один раз при монтировании приложения

  return (
    <AppProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </AppProvider>
  );
}

export default MyApp;