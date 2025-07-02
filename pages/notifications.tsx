// pages/notifications.tsx
import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaBell, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import styles from '../styles/GenericPage.module.css'; // Предполагаем наличие общего файла стилей

export default function NotificationsPage() {
  const [pushEnabled, setPushEnabled] = useState(true); // Пример состояния для настройки

  const handleTogglePush = () => {
    setPushEnabled(!pushEnabled);
    // Здесь можно добавить логику для сохранения настройки на сервере
  };

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Уведомления | Hedonist</title>
        <meta name="description" content="Настройки уведомлений" />
      </Head>

      <header className={styles.header}>
        <Link href="/profile" className={styles.backButton}>
          <FaArrowLeft />
        </Link>
        <h1 className={styles.headerTitle}>Уведомления</h1>
        <div></div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.section}>
          <h2>Push-уведомления</h2>
          <div className={styles.toggleSetting}>
            <span>Получать push-уведомления</span>
            <button onClick={handleTogglePush} className={styles.toggleButton}>
              {pushEnabled ? <FaToggleOn size={32} color="#10b981" /> : <FaToggleOff size={32} color="#ef4444" />}
            </button>
          </div>
          <p className={styles.infoMessage}>
            Включение уведомлений позволит вам быть в курсе статусов заказов, новых акций и персональных предложений.
          </p>
        </section>

        {/* Можно добавить другие типы уведомлений, например, уведомления по почте, в Telegram */}
        <section className={styles.section}>
          <h2>Уведомления в Telegram</h2>
          <p className={styles.infoMessage}>
            Все важные уведомления также приходят в чат с нашим Telegram ботом.
          </p>
          <Link href="https://t.me/YOUR_BOT_USERNAME" target="_blank" className={styles.actionButton}>
            <FaBell /> Открыть чат с ботом
          </Link>
        </section>
      </main>
    </div>
  );
}