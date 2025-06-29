// pages/profile.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/ProfilePage.module.css';
import { useApp } from '../contexts/AppContext';
import {
  FaUser,
  FaShoppingBag,
  FaHeart,
  FaCog,
  FaSignOutAlt,
  FaEdit,
  FaTelegram,
  FaShoppingCart,
  FaHome,
  FaChevronRight,
  FaBell,
  FaQuestionCircle,
  FaStar
} from 'react-icons/fa';
import { User } from '@prisma/client'; // Импортируем тип User

// Расширяем тип User, чтобы включить счетчик заказов
type UserWithCounts = User & {
  _count: {
    orders: number;
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const { state: appState } = useApp();

  // Состояние для хранения данных пользователя
  const [user, setUser] = useState<UserWithCounts | null>(null);

  useEffect(() => {
    // Функция для загрузки данных пользователя
    const fetchUserProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          console.error("Не удалось загрузить профиль");
        }
      } catch (error) {
        console.error("Ошибка при запросе профиля:", error);
      }
    };

    fetchUserProfile();
  }, []);

  // Формируем меню. Данные берутся из состояния `user` или `appState`
  const menuItems = [
    {
      icon: <FaShoppingBag />,
      title: 'Мои заказы',
      subtitle: `${user?._count.orders || 0} заказов`,
      href: '/orders',
      color: '#667eea'
    },
    {
      icon: <FaHeart />,
      title: 'Избранное',
      subtitle: `${appState.favoritesCount} товаров`,
      href: '/favorites',
      color: '#ef4444'
    },
    { icon: <FaBell />, title: 'Уведомления', subtitle: 'Настройки push-уведомлений', href: '/notifications', color: '#f59e0b' },
    { icon: <FaCog />, title: 'Настройки', subtitle: 'Персонализация аккаунта', href: '/settings', color: '#64748b' },
    { icon: <FaQuestionCircle />, title: 'Помощь', subtitle: 'FAQ и поддержка', href: '/help', color: '#10b981' }
  ];

  // Рендерим заглушку, пока данные загружаются
  if (!user) {
    return <div className={styles.pageContainer}><p style={{textAlign: 'center', paddingTop: '2rem'}}>Загрузка профиля...</p></div>;
  }

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Профиль | Elite App</title>
        <meta name="description" content="Ваш профиль в Elite App" />
      </Head>

      <main className={styles.mainContent}>
        {/* Профиль пользователя */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            {/* Аватарку пока оставим как заглушку */}
            <img src="/api/placeholder/100/100" alt={user.firstName || ''} className={styles.avatar} />
            <button className={styles.editAvatarButton}><FaEdit /></button>
          </div>
          
          <div className={styles.userInfo}>
            <h1 className={styles.userName}>{`${user.firstName} ${user.lastName}`}</h1>
            <p className={styles.userHandle}>
              <FaTelegram className={styles.telegramIcon} />
              {user.username}
            </p>
          </div>
        </div>

        {/* Статистика */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{user._count.orders}</div>
            <div className={styles.statLabel}>Заказов</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{appState.favoritesCount}</div>
            <div className={styles.statLabel}>Избранных</div>
          </div>
          <div className={styles.statCard}>
            {/* Сумму пока оставим как заглушку */}
            <div className={styles.statNumber}>₽145k</div>
            <div className={styles.statLabel}>Потрачено</div>
          </div>
        </div>

        {/* VIP статус */}
        <div className={styles.vipCard}>
            <div className={styles.vipHeader}>
              <div className={styles.vipIcon}><FaStar /></div>
              <div className={styles.vipInfo}>
                <h3 className={styles.vipTitle}>VIP статус</h3>
                <p className={styles.vipSubtitle}>Эксклюзивные скидки и привилегии</p>
              </div>
            </div>
            <div className={styles.vipProgress}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{width: '75%'}}></div>
              </div>
              <span className={styles.progressText}>До Gold VIP: ₽25,000</span>
            </div>
        </div>

        {/* Меню */}
        <div className={styles.menuSection}>
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href} className={styles.menuItem}>
              <div className={styles.menuIcon} style={{color: item.color}}>{item.icon}</div>
              <div className={styles.menuContent}>
                <h3 className={styles.menuTitle}>{item.title}</h3>
                <p className={styles.menuSubtitle}>{item.subtitle}</p>
              </div>
              <FaChevronRight className={styles.menuArrow} />
            </Link>
          ))}
        </div>

        {/* Выход */}
        <button className={styles.logoutButton}>
          <FaSignOutAlt />
          <span>Выйти из аккаунта</span>
        </button>

        {/* Версия приложения */}
        <div className={styles.appVersion}>
          Elite App v1.0.0
        </div>
      </main>

      {/* Нижняя навигация */}
      <nav className={styles.bottomNav}>
        <Link href="/" className={styles.navItem}>
          <FaHome className={styles.navIcon} />
          <span className={styles.navLabel}>Главная</span>
        </Link>
        <Link href="/favorites" className={styles.navItem}>
          <FaHeart className={styles.navIcon} />
          {appState.favoritesCount > 0 && <div className={styles.navBadge}>{appState.favoritesCount}</div>}
          <span className={styles.navLabel}>Избранное</span>
        </Link>
        <Link href="/cart" className={styles.navItem}>
          <FaShoppingCart className={styles.navIcon} />
          {appState.cartCount > 0 && <div className={styles.navBadge}>{appState.cartCount}</div>}
          <span className={styles.navLabel}>Корзина</span>
        </Link>
        <Link href="/profile" className={`${styles.navItem} ${styles.active}`}>
          <FaUser className={styles.navIcon} />
          <span className={styles.navLabel}>Профиль</span>
          <div className={styles.navIndicator}></div>
        </Link>
      </nav>
    </div>
  );
}