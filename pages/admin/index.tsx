// pages/admin/index.tsx - ИСПРАВЛЕНО
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminLayout from '../../components/AdminLayout';
import styles from './Dashboard.module.css';
import { FaChartBar, FaUsers, FaDollarSign, FaBoxOpen, FaTruck, FaWarehouse } from 'react-icons/fa';
import { MdOutlineAccessTime, MdCheckCircleOutline } from 'react-icons/md';
import { useAuth } from '../../components/AuthProvider';

interface DashboardStats {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  totalRevenue: number;
  totalProfit: number;
  newUsersLast30Days: number;
  totalCostOfGoods: number;
  totalDeliveryCosts: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading, isAdmin, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ИСПРАВЛЕНИЕ: Улучшенная проверка доступа
  useEffect(() => {
    if (!isLoading) {
      console.log('Admin Dashboard - Auth Check:', {
        isAuthenticated,
        isAdmin,
        user: user ? {
          id: user.id,
          telegramId: user.telegramId,
          isAdmin: user.isAdmin
        } : null
      });

      // Если не авторизован, перенаправляем на главную
      if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to home');
        router.push('/');
        return;
      }

      // Если не админ, показываем сообщение и перенаправляем
      if (!isAdmin) {
        console.log('User is not admin, access denied');
        alert(`Доступ запрещен. Ваш Telegram ID: ${user?.telegramId}. Требуется ID админа.`);
        router.push('/');
        return;
      }

      console.log('Admin access granted');
    }
  }, [user, isLoading, isAdmin, isAuthenticated, router]);

  // Загрузка статистики только для авторизованных админов
  useEffect(() => {
    async function fetchStats() {
      if (!isAuthenticated || !isAdmin) {
        return;
      }

      try {
        setLoadingStats(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Токен авторизации не найден');
        }
        
        const res = await fetch('/api/admin/dashboard-stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            // Токен недействителен
            alert('Сессия истекла. Требуется повторная авторизация.');
            router.push('/');
            return;
          }
          const errorData = await res.json();
          throw new Error(errorData.message || `Ошибка: ${res.status}`);
        }
        
        const data: DashboardStats = await res.json();
        setStats(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Не удалось загрузить статистику.';
        console.error('Failed to fetch dashboard stats:', err);
        setError(message);
      } finally {
        setLoadingStats(false);
      }
    }

    // Загружаем статистику только если пользователь авторизован и является админом
    if (!isLoading && isAuthenticated && isAdmin) {
      fetchStats();
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  // Показываем загрузку при проверке авторизации
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '10px' }}>Проверка доступа...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Если нет доступа, возвращаем null (перенаправление произойдет в useEffect)
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  // Показываем загрузку статистики
  if (loadingStats) {
    return (
      <AdminLayout title="Дашборд">
        <div style={{textAlign: 'center', padding: '1rem'}}>
          Загрузка статистики...
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout title="Дашборд">
        <div style={{textAlign: 'center', padding: '1rem', color: 'red'}}>
          Ошибка загрузки: {error}
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Обновить
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Дашборд">
      <div className={styles.dashboardContainer}>
        <h2 className={styles.dashboardTitle}>Добро пожаловать в админ-панель!</h2>
        <p className={styles.dashboardGreeting}>
          Здесь вы можете управлять всеми аспектами вашего магазина.
        </p>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          Администратор: {user?.firstName} {user?.lastName} 
          {user?.username && ` (@${user.username})`} 
          (ID: {user?.telegramId})
        </p>
        
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{backgroundColor: '#eef2ff'}}>
              <FaDollarSign size={32} color="#4f46e5" />
              <h3 className={styles.statCardTitle}>Общая выручка</h3>
              <p className={styles.statCardValue}>₽{stats.totalRevenue.toLocaleString('ru-RU')}</p>
              <p className={styles.statCardDescription}>Сумма всех успешных заказов.</p>
            </div>
            
            <div className={styles.statCard} style={{backgroundColor: '#dcfce7'}}>
              <FaChartBar size={32} color="#10b981" />
              <h3 className={styles.statCardTitle}>Чистая прибыль</h3>
              <p className={styles.statCardValue}>₽{stats.totalProfit.toLocaleString('ru-RU')}</p>
              <p className={styles.statCardDescription}>Выручка минус затраты.</p>
            </div>

            <div className={styles.statCard} style={{backgroundColor: '#fef3c7'}}>
              <FaWarehouse size={32} color="#f59e0b" />
              <h3 className={styles.statCardTitle}>Себестоимость</h3>
              <p className={styles.statCardValue}>₽{stats.totalCostOfGoods.toLocaleString('ru-RU')}</p>
              <p className={styles.statCardDescription}>Затраты на проданные товары.</p>
            </div>
            
            <div className={styles.statCard} style={{backgroundColor: '#fee2e2'}}>
              <FaTruck size={32} color="#ef4444" />
              <h3 className={styles.statCardTitle}>Затраты на доставку</h3>
              <p className={styles.statCardValue}>₽{stats.totalDeliveryCosts.toLocaleString('ru-RU')}</p>
              <p className={styles.statCardDescription}>Оплачено вами за доставку.</p>
            </div>

            <div className={styles.statCard} style={{backgroundColor: '#e0f2fe'}}>
              <FaUsers size={32} color="#0ea5e9" />
              <h3 className={styles.statCardTitle}>Новые пользователи</h3>
              <p className={styles.statCardValue}>{stats.newUsersLast30Days}</p>
              <p className={styles.statCardDescription}>За последние 30 дней.</p>
            </div>
            
            <div className={styles.statCard} style={{backgroundColor: '#f3f4f6'}}>
              <FaBoxOpen size={32} color="#6b7280" />
              <h3 className={styles.statCardTitle}>Всего заказов</h3>
              <p className={styles.statCardValue}>{stats.totalOrders}</p>
              <p className={styles.statCardDescription}>Включая все статусы.</p>
            </div>

            <div className={styles.statCard} style={{backgroundColor: '#d1fae5'}}>
              <MdCheckCircleOutline size={32} color="#059669" />
              <h3 className={styles.statCardTitle}>Оплаченные заказы</h3>
              <p className={styles.statCardValue}>{stats.ordersByStatus['PAID'] || 0}</p>
              <p className={styles.statCardDescription}>Готовы к обработке.</p>
            </div>
            
            <div className={styles.statCard} style={{backgroundColor: '#fefce8'}}>
              <MdOutlineAccessTime size={32} color="#ca8a04" />
              <h3 className={styles.statCardTitle}>Заказы в ожидании</h3>
              <p className={styles.statCardValue}>{stats.ordersByStatus['PENDING'] || 0}</p>
              <p className={styles.statCardDescription}>Ожидают подтверждения.</p>
            </div>
          </div>
        )}

        <h3 style={{ 
          fontSize: '20px', 
          fontWeight: 'bold', 
          color: '#374151', 
          marginBottom: '24px', 
          marginTop: '48px' 
        }}>
          Быстрые ссылки
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          marginTop: '20px'
        }}>
          <Link href="/admin/orders" style={{ 
            display: 'block', 
            padding: '16px', 
            backgroundColor: 'white', 
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#374151',
            border: '1px solid #e5e7eb',
            transition: 'box-shadow 0.2s',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            📦 Управление заказами
          </Link>
          <Link href="/admin/products" style={{ 
            display: 'block', 
            padding: '16px', 
            backgroundColor: 'white', 
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#374151',
            border: '1px solid #e5e7eb',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            🛍️ Управление товарами
          </Link>
          <Link href="/admin/users" style={{ 
            display: 'block', 
            padding: '16px', 
            backgroundColor: 'white', 
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#374151',
            border: '1px solid #e5e7eb',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            👥 Управление пользователями
          </Link>
        </div>
        
        {/* Дополнительная отладочная информация */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ marginBottom: '10px', color: '#495057' }}>Информация о сессии:</h4>
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            <p>• Авторизован: {isAuthenticated ? '✅ Да' : '❌ Нет'}</p>
            <p>• Админ: {isAdmin ? '✅ Да' : '❌ Нет'}</p>
            <p>• Telegram ID: {user?.telegramId}</p>
            <p>• Токен в localStorage: {localStorage.getItem('authToken') ? '✅ Есть' : '❌ Нет'}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
