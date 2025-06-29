// pages/admin/index.tsx
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Link from 'next/link';
import styles from './Dashboard.module.css';
import { FaChartBar, FaUsers, FaDollarSign, FaBoxOpen, FaTruck, FaWarehouse } from 'react-icons/fa';
import { MdOutlineAccessTime, MdCheckCircleOutline } from 'react-icons/md';

// Определяем полный тип данных, которые приходят от API
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/dashboard-stats');
        if (!res.ok) {
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
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <AdminLayout title="Дашборд"><div style={{textAlign: 'center', padding: '1rem'}}>Загрузка статистики...</div></AdminLayout>;
  if (error) return <AdminLayout title="Дашборд"><div style={{textAlign: 'center', padding: '1rem', color: 'red'}}>Ошибка загрузки: {error}</div></AdminLayout>;

  return (
    <AdminLayout title="Дашборд">
      <div className={styles.dashboardContainer}>
        <h2 className={styles.dashboardTitle}>Добро пожаловать в админ-панель!</h2>
        <p className={styles.dashboardGreeting}>Здесь вы можете управлять всеми аспектами вашего магазина.</p>
        
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

        <h3 className="text-xl font-bold text-gray-800 mb-6 mt-12">Быстрые ссылки</h3>
        <div className={styles.quickLinksGrid}>
          {/* ... (Блок быстрых ссылок остается без изменений) ... */}
        </div>
      </div>
    </AdminLayout>
  );
}