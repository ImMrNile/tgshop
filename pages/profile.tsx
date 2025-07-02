// pages/profile.tsx - ИСПРАВЛЕНО
// ===================================

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/ProfilePage.module.css';
import { useApp } from '../contexts/AppContext';
import { User as PrismaUser } from '@prisma/client';
import { generateEmojiAvatar } from '../lib/avatarUtils';
import { generateReferralLink, handleShare, formatCurrency } from '../lib/utils';
import {
  FaUser,
  FaShoppingBag,
  FaHeart,
  FaSignOutAlt,
  FaEdit,
  FaTelegram,
  FaShoppingCart,
  FaHome,
  FaChevronRight,
  FaQuestionCircle, 
  FaShareAlt,
  FaCopy,
  FaWallet,
  FaUsers,
  FaChartLine,
  FaTrophy
} from 'react-icons/fa';

// Типы для статистики пользователя
interface UserStats {
  totalSpent: number;
  completedOrdersCount: number;
  referralEarnings: number;
  averageOrderValue: number;
  referralsCount: number;
  vipStatus: {
    level: string;
    nextThreshold: number | null;
    progress: number;
  };
  recentOrders: Array<{
    id: string;
    total: number;
    createdAt: string;
    itemsCount: number;
  }>;
  referralDetails: Array<{
    name: string;
    joinedAt: string;
    ordersCount: number;
    totalSpent: number;
  }>;
}

type UserWithCounts = PrismaUser & {
  _count: {
    orders: number;
  };
};

export default function ProfilePage() {
  const { state: appState } = useApp();
  const [user, setUser] = useState<UserWithCounts | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [avatar, setAvatar] = useState<{ emoji: string, backgroundColor: string } | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/user/profile', { headers });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          if (userData.id) {
            setAvatar(generateEmojiAvatar(userData.id, userData.firstName || userData.username));
            setReferralLink(generateReferralLink(userData.id));
          }
        } else if (res.status === 401) {
          alert('Ваша сессия истекла. Пожалуйста, войдите заново.');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      } catch (error) {
        console.error("Ошибка при запросе профиля:", error);
      }
    };

    const fetchUserStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = {};
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/user/stats', { headers });
        if (res.ok) {
          const stats = await res.json();
          setUserStats(stats);
        }
      } catch (error) {
        console.error("Ошибка при запросе статистики:", error);
      }
    };

    fetchUserProfile();
    fetchUserStats();
  }, []);

  const handleShareReferral = async () => {
    if (!referralLink) return;

    const success = await handleShare(
      'Присоединяйтесь к Hedonist!', // Изменено
      'Привет! Зацени Hedonist - премиум магазин одежды. Переходи по моей ссылке и получи скидку!', // Изменено
      referralLink
    );

    if (success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/login';
  };

  const menuItems = [
    {
      icon: <FaShoppingBag />,
      title: 'Мои заказы',
      subtitle: `${userStats?.completedOrdersCount || 0} заказов`,
      href: '/orders',
      color: '#8a2be2'
    },
    {
      icon: <FaHeart />,
      title: 'Избранное',
      subtitle: `${appState.favoritesCount} товаров`,
      href: '/favorites',
      color: '#ef4444'
    },
    {
      icon: <FaUsers />,
      title: 'Мои рефералы',
      subtitle: `${userStats?.referralsCount || 0} приглашенных`,
      href: '/referrals',
      color: '#10b981'
    },
    {
      icon: <FaWallet />,
      title: 'Баланс',
      subtitle: `${formatCurrency(userStats?.referralEarnings || 0)} доступно`,
      href: '/wallet',
      color: '#f59e0b'
    },
    { 
      icon: <FaQuestionCircle />, 
      title: 'Помощь', 
      subtitle: 'FAQ и поддержка', 
      href: '/help', 
      color: '#8b5cf6' 
    }
  ];

  if (!user) {
    return (
      <div className={styles.pageContainer}>
        <p style={{textAlign: 'center', paddingTop: '2rem'}}>Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Профиль | Hedonist</title> {/* Изменено */}
        <meta name="description" content="Ваш профиль в Hedonist" /> {/* Изменено */}
      </Head>

      <main className={styles.mainContent}>
        {/* Профиль пользователя */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarContainer}>
            {avatar ? (
              <div 
                className={styles.avatar} 
                style={{ backgroundColor: avatar.backgroundColor }}
              >
                <span className={styles.emoji}>{avatar.emoji}</span>
              </div>
            ) : (
              <div className={styles.avatarPlaceholder}>
                <FaUser />
              </div>
            )}
            <button className={styles.editAvatarButton}><FaEdit /></button>
          </div>
          
          <div className={styles.userInfo}>
            <h1 className={styles.userName}>
              {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Пользователь'}
            </h1>
            <p className={styles.userHandle}>
              <FaTelegram className={styles.telegramIcon} />
              {user.username || `ID: ${user.telegramId}`}
            </p>
          </div>
        </div>

        {/* Статистика */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaShoppingBag />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{userStats?.completedOrdersCount || 0}</div>
              <div className={styles.statLabel}>Заказов</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaChartLine />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>
                {formatCurrency(userStats?.totalSpent || 0)}
              </div>
              <div className={styles.statLabel}>Потрачено</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaWallet />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>
                {formatCurrency(userStats?.referralEarnings || 0)}
              </div>
              <div className={styles.statLabel}>Заработано</div>
            </div>
          </div>
          
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaUsers />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statNumber}>{userStats?.referralsCount || 0}</div>
              <div className={styles.statLabel}>Рефералов</div>
            </div>
          </div>
        </div>

        {/* VIP статус */}
        {userStats && (
          <div className={styles.vipCard}>
            <div className={styles.vipHeader}>
              <div className={styles.vipIcon}>
                <FaTrophy />
              </div>
              <div className={styles.vipInfo}>
                <h3 className={styles.vipTitle}>
                  {userStats.vipStatus.level} VIP статус
                </h3>
                <p className={styles.vipSubtitle}>
                  {userStats.vipStatus.nextThreshold 
                    ? `До следующего уровня: ${formatCurrency(userStats.vipStatus.nextThreshold - userStats.totalSpent)}`
                    : 'Максимальный уровень достигнут!'
                  }
                </p>
              </div>
            </div>
            <div className={styles.vipProgress}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{width: `${Math.min(userStats.vipStatus.progress, 100)}%`}}
                ></div>
              </div>
              <span className={styles.progressText}>
                {Math.round(userStats.vipStatus.progress)}% до следующего уровня
              </span>
            </div>
          </div>
        )}

        {/* Реферальная программа */}
        {referralLink && (
          <div className={styles.referralCard}>
            <div className={styles.referralHeader}>
              <div className={styles.referralIcon}>
                <FaShareAlt />
              </div>
              <div className={styles.referralInfo}>
                <h3 className={styles.referralTitle}>Реферальная программа</h3>
                <p className={styles.referralText}>
                  Получайте 5% с каждого заказа ваших друзей
                </p>
              </div>
            </div>
            <div className={styles.referralStats}>
              <div className={styles.referralStat}>
                <span className={styles.referralStatNumber}>
                  {userStats?.referralsCount || 0}
                </span>
                <span className={styles.referralStatLabel}>Приглашено</span>
              </div>
              <div className={styles.referralStat}>
                <span className={styles.referralStatNumber}>
                  {formatCurrency(userStats?.referralEarnings || 0)}
                </span>
                <span className={styles.referralStatLabel}>Заработано</span>
              </div>
            </div>
            <div className={styles.referralActions}>
              <button 
                onClick={handleShareReferral} 
                className={styles.shareButton}
                disabled={shareSuccess}
              >
                {shareSuccess ? <FaCopy /> : <FaShareAlt />}
                {shareSuccess ? 'Скопировано!' : 'Поделиться ссылкой'}
              </button>
            </div>
          </div>
        )}

        {/* Меню */}
        <div className={styles.menuSection}>
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href} className={styles.menuItem}>
              <div className={styles.menuIcon} style={{color: item.color}}>
                {item.icon}
              </div>
              <div className={styles.menuContent}>
                <h3 className={styles.menuTitle}>{item.title}</h3>
                <p className={styles.menuSubtitle}>{item.subtitle}</p>
              </div>
              <FaChevronRight className={styles.menuArrow} />
            </Link>
          ))}
        </div>

        {/* Последние заказы */}
        {userStats?.recentOrders && userStats.recentOrders.length > 0 && (
          <div className={styles.recentOrdersSection}>
            <h3 className={styles.sectionTitle}>Последние заказы</h3>
            <div className={styles.recentOrders}>
              {userStats.recentOrders.map((order) => (
                <div key={order.id} className={styles.orderItem}>
                  <div className={styles.orderInfo}>
                    <span className={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <span className={styles.orderItems}>
                      {order.itemsCount} товар{order.itemsCount > 1 ? 'а' : ''}
                    </span>
                  </div>
                  <span className={styles.orderTotal}>
                    {formatCurrency(order.total)}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/orders" className={styles.viewAllOrders}>
              Посмотреть все заказы
            </Link>
          </div>
        )}

        {/* Выход */}
        <button onClick={handleLogout} className={styles.logoutButton}>
          <FaSignOutAlt />
          <span>Выйти из аккаунта</span>
        </button>

        {/* Версия приложения */}
        <div className={styles.appVersion}>
          Hedonist v1.0.0 {/* Изменено */}
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
          {appState.favoritesCount > 0 && (
            <div className={styles.navBadge}>{appState.favoritesCount}</div>
          )}
          <span className={styles.navLabel}>Избранное</span>
        </Link>
        <Link href="/cart" className={styles.navItem}>
          <FaShoppingCart className={styles.navIcon} />
          {appState.cartCount > 0 && (
            <div className={styles.navBadge}>{appState.cartCount}</div>
          )}
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