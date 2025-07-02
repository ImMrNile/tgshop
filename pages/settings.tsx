// pages/settings.tsx
import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaCog, FaUserEdit, FaLock, FaGlobe } from 'react-icons/fa';
import styles from '../styles/GenericPage.module.css'; // Предполагаем наличие общего файла стилей
import formStyles from '../styles/Checkout.module.css'; // Для стилей кнопок/форм

export default function SettingsPage() {
  // Пример состояний для настроек
  const [language, setLanguage] = useState('ru'); // Русский по умолчанию
  const [theme, setTheme] = useState('dark'); // Темная тема по умолчанию

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    // Логика сохранения настройки языка
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
    // Логика применения и сохранения настройки темы
  };

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Настройки | Hedonist</title>
        <meta name="description" content="Настройки вашего аккаунта" />
      </Head>

      <header className={styles.header}>
        <Link href="/profile" className={styles.backButton}>
          <FaArrowLeft />
        </Link>
        <h1 className={styles.headerTitle}>Настройки</h1>
        <div></div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.section}>
          <h2>Аккаунт</h2>
          <Link href="/settings/edit-profile" className={styles.menuItem}>
            <div className={styles.menuIcon}><FaUserEdit /></div>
            <div className={styles.menuContent}>
              <h3 className={styles.menuTitle}>Редактировать профиль</h3>
              <p className={styles.menuSubtitle}>Изменить имя, фамилию, username</p>
            </div>
            <FaChevronRight className={styles.menuArrow} />
          </Link>
          <Link href="/settings/change-password" className={styles.menuItem}>
            <div className={styles.menuIcon}><FaLock /></div>
            <div className={styles.menuContent}>
              <h3 className={styles.menuTitle}>Изменить пароль</h3>
              <p className={styles.menuSubtitle}>Обновить ваш пароль</p>
            </div>
            <FaChevronRight className={styles.menuArrow} />
          </Link>
        </section>

        <section className={styles.section}>
          <h2>Приложение</h2>
          <div className={formStyles.formGroup}>
            <label htmlFor="language">Язык:</label>
            <select
              id="language"
              value={language}
              onChange={handleLanguageChange}
              className={formStyles.formInput}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className={formStyles.formGroup}>
            <label htmlFor="theme">Тема:</label>
            <select
              id="theme"
              value={theme}
              onChange={handleThemeChange}
              className={formStyles.formInput}
            >
              <option value="dark">Темная</option>
              <option value="light">Светлая</option>
            </select>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Дополнительно</h2>
          <Link href="/policy" className={styles.menuItem}>
            <div className={styles.menuIcon}><FaGlobe /></div>
            <div className={styles.menuContent}>
              <h3 className={styles.menuTitle}>Политика конфиденциальности</h3>
            </div>
            <FaChevronRight className={styles.menuArrow} />
          </Link>
          <Link href="/terms" className={styles.menuItem}>
            <div className={styles.menuIcon}><FaGlobe /></div>
            <div className={styles.menuContent}>
              <h3 className={styles.menuTitle}>Условия использования</h3>
            </div>
            <FaChevronRight className={styles.menuArrow} />
          </Link>
        </section>
      </main>
    </div>
  );
}