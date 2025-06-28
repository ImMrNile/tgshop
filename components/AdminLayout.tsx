// components/AdminLayout.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import styles from './AdminLayout.module.css'; // Импортируем CSS Modules

// Импорты иконок для навигации
import { FaHome, FaBoxOpen, FaShoppingCart, FaUsers, FaChartLine, FaSignOutAlt } from 'react-icons/fa';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title = 'Админ-панель' }: AdminLayoutProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // useEffect для проверки авторизации
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Здесь мы делаем простой запрос на API для проверки "авторизации"
        // В реальном приложении это должна быть проверка JWT токена в куках
        const res = await fetch('/api/admin/check-auth');
        if (res.ok) {
          setIsAuthorized(true);
        } else {
          router.push('/admin/login');
        }
      } catch (e) {
        console.error("Auth check failed:", e);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  // ОПРЕДЕЛЕНИЕ ФУНКЦИИ handleLogout
  const handleLogout = async () => {
    // В реальном приложении здесь будет запрос к /api/admin/logout для очистки токена/сессии
    // Сейчас просто сбрасываем состояние авторизации и перенаправляем на страницу входа.
    setIsAuthorized(false); 
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className={`${styles.container} ${styles.loadingContainer}`}> {/* Добавьте стили для центрирования загрузки */}
        <div style={{textAlign: 'center', padding: '1rem', fontSize: '1.25rem', color: '#4b5563'}}>Загрузка админ-панели...</div> {/* Стили inline, так как это временный лоадер */}
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Пользователь будет перенаправлен на страницу входа
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>{title} | Elite App Admin</title>
      </Head>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Админ-панель</h1>
          <nav className={styles.nav}>
            <ul className={styles.navList}>
              <li>
                <Link href="/admin" className={styles.navLink}>
                  <FaHome className={styles.navIcon} /> Дашборд
                </Link>
              </li>
              <li>
                <Link href="/admin/products" className={styles.navLink}>
                  <FaBoxOpen className={styles.navIcon} /> Товары
                </Link>
              </li>
              <li>
                <Link href="/admin/orders" className={styles.navLink}>
                  <FaShoppingCart className={styles.navIcon} /> Заказы
                </Link>
              </li>
              <li>
                <Link href="/admin/users" className={styles.navLink}>
                  <FaUsers className={styles.navIcon} /> Пользователи
                </Link>
              </li>
              <li>
                <Link href="/admin/stats" className={styles.navLink}>
                  <FaChartLine className={styles.navIcon} /> Статистика
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout} // Теперь handleLogout определена!
                  className={styles.logoutButton}
                >
                  <FaSignOutAlt className={styles.navIcon} /> Выйти
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main className={styles.mainContent}>
        {children}
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2025 Elite App Admin. Все права защищены.</p>
      </footer>
    </div>
  );
}