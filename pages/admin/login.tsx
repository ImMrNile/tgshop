import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from './Login.module.css'; // Импортируем CSS Modules

export default function AdminLogin() {
  const [telegramId, setTelegramId] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!telegramId) {
      setError('Пожалуйста, введите ваш Telegram ID.');
      return;
    }

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/admin');
      } else {
        setError(data.message || 'Ошибка входа.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Произошла ошибка при попытке входа.');
    }
  };

  return (
    <div className={styles.loginContainer}>
      <Head>
        <title>Вход в Админ-панель</title>
      </Head>
      <div className={styles.loginBox}>
        <h1 className={styles.loginTitle}>Админ-панель</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="telegramId" className={styles.label}>
              Ваш Telegram ID:
            </label>
            <input
              type="text"
              id="telegramId"
              className={styles.input}
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              placeholder="Введите ваш Telegram ID"
            />
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitButton}
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}