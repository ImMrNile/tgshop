// pages/referrals.tsx
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaShareAlt, FaCopy, FaUserPlus } from 'react-icons/fa';
import styles from '../styles/GenericPage.module.css'; // Используем общий файл стилей
import profileStyles from '../styles/ProfilePage.module.css'; // Для некоторых общих стилей, если нужны
import { useAuth } from '../components/AuthProvider';
import { generateReferralLink, handleShare, formatCurrency } from '../lib/utils'; // Убедитесь, что handleShare и formatCurrency доступны

// Интерфейс для деталей рефералов (должен совпадать с UserStats.referralDetails)
interface ReferralDetail {
  name: string;
  joinedAt: string;
  ordersCount: number;
  totalSpent: number;
}

interface UserStatsForReferrals {
  referralEarnings: number;
  referralsCount: number;
  referralDetails: ReferralDetail[];
}

export default function ReferralsPage() {
  const { isAuthenticated, user } = useAuth();
  const [userStats, setUserStats] = useState<UserStatsForReferrals | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('authToken');
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/user/stats', { headers });
        if (res.ok) {
          const stats: UserStatsForReferrals = await res.json();
          setUserStats(stats);
          if (user.id) {
            setReferralLink(generateReferralLink(user.id));
          }
        } else {
          const errorData = await res.json();
          setError(errorData.message || 'Не удалось загрузить реферальную статистику.');
        }
      } catch (err: unknown) { // ИСПРАВЛЕНИЕ: Изменено any на unknown
        setError((err instanceof Error) ? err.message : 'Произошла ошибка при загрузке данных.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, [isAuthenticated, user]);

  const handleShareReferral = async () => {
    if (!referralLink) return;

    const success = await handleShare(
      'Присоединяйтесь к Hedonist!',
      'Привет! Зацени Hedonist - премиум магазин одежды. Переходи по моей ссылке и получи скидку!',
      referralLink
    );

    if (success) {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingMessage}>Загрузка реферальной программы...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <p className={styles.errorMessage}>Ошибка: {error}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.pageContainer}>
        <p className={styles.placeholderText}>Пожалуйста, авторизуйтесь, чтобы просмотреть вашу реферальную статистику.</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Мои рефералы | Hedonist</title>
        <meta name="description" content="Реферальная программа Hedonist" />
      </Head>

      <header className={styles.header}>
        <Link href="/profile" className={styles.backButton}>
          <FaArrowLeft />
        </Link>
        <h1 className={styles.headerTitle}>Мои рефералы</h1>
        <div></div>
      </header>

      <main className={styles.mainContent}>
        <div className={profileStyles.referralCard}>
          <div className={profileStyles.referralHeader}>
            <div className={profileStyles.referralIcon}>
              <FaShareAlt />
            </div>
            <div className={profileStyles.referralInfo}>
              <h3 className={profileStyles.referralTitle}>Реферальная программа</h3>
              <p className={profileStyles.referralText}>
                Получайте 5% с каждого заказа ваших друзей
              </p>
            </div>
          </div>
          <div className={profileStyles.referralStats}>
            <div className={profileStyles.referralStat}>
              <span className={profileStyles.referralStatNumber}>
                {userStats?.referralsCount || 0}
              </span>
              <span className={profileStyles.referralStatLabel}>Приглашено</span>
            </div>
            <div className={profileStyles.referralStat}>
              <span className={profileStyles.referralStatNumber}>
                {formatCurrency(userStats?.referralEarnings || 0)}
              </span>
              <span className={profileStyles.referralStatLabel}>Заработано</span>
            </div>
          </div>
          <div className={profileStyles.referralActions}>
            {referralLink && (
              <button 
                onClick={handleShareReferral} 
                className={profileStyles.shareButton}
                disabled={shareSuccess}
              >
                {shareSuccess ? <FaCopy /> : <FaShareAlt />}
                {shareSuccess ? 'Скопировано!' : 'Поделиться ссылкой'}
              </button>
            )}
          </div>
        </div>

        {userStats?.referralDetails && userStats.referralDetails.length > 0 && (
          <div className={styles.section}>
            <h2>Приглашенные пользователи</h2>
            <div className={styles.listContainer}>
              {userStats.referralDetails.map((referral, index) => (
                <div key={index} className={styles.listItem}>
                  <div>
                    <strong>{referral.name}</strong><br/>
                    <small>Присоединился: {new Date(referral.joinedAt).toLocaleDateString('ru-RU')}</small>
                  </div>
                  <div>
                    <p>Заказов: {referral.ordersCount}</p>
                    <p>Потрачено: {formatCurrency(referral.totalSpent)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {userStats?.referralDetails && userStats.referralDetails.length === 0 && (
          <div className={styles.infoMessage}>
            <FaUserPlus size={48} />
            <p>Вы пока никого не пригласили. Поделитесь вашей реферальной ссылкой, чтобы начать зарабатывать!</p>
          </div>
        )}
      </main>
    </div>
  );
}