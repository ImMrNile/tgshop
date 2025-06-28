// pages/admin/index.tsx
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import Link from 'next/link';
import styles from './Dashboard.module.css'; // Импортируем CSS Modules

// Импорты иконок для дашборда
import { FaChartBar, FaUsers, FaDollarSign, FaBoxOpen, FaSync, FaTruck } from 'react-icons/fa';
import { MdOutlineAccessTime, MdCheckCircleOutline } from 'react-icons/md';

interface DashboardStats {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  totalRevenue: number;
  totalProfit: number;
  newUsersLast30Days: number;
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
      } catch (err: any) {
        console.error('Failed to fetch dashboard stats:', err);
        setError(err.message || 'Не удалось загрузить статистику.');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <AdminLayout title="Дашборд"><div style={{textAlign: 'center', padding: '1rem'}}>Загрузка статистики...</div></AdminLayout>;
  if (error) return <AdminLayout title="Дашборд"><div style={{textAlign: 'center', padding: '1rem', color: 'red'}}>Ошибка загрузки статистики: {error}</div></AdminLayout>;

  return (
    <AdminLayout title="Дашборд">
      <div className={styles.dashboardContainer}>
        <h2 className={styles.dashboardTitle}>Добро пожаловать в админ-панель!</h2>
        <p className={styles.dashboardGreeting}>Здесь вы можете управлять всеми аспектами вашего магазина элитной одежды.</p>
        
        {stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard} style={{backgroundColor: '#eef2ff'}}> {/* bg-indigo-50 */}
              <FaBoxOpen size={32} color="#4f46e5" /> {/* text-indigo-600 */}
              <h3 className={styles.statCardTitle}>Всего заказов</h3>
              <p className={styles.statCardValue}>{stats.totalOrders}</p>
              <p className={styles.statCardDescription}>Всего оформленных заказов.</p>
            </div>

            <div className={styles.statCard} style={{backgroundColor: '#dcfce7'}}> {/* bg-green-50 */}
              <FaDollarSign size={32} color="#10b981" /> {/* text-green-600 */}
              <h3 className={styles.statCardTitle}>Общая выручка</h3>
              <p className={styles.statCardValue}>₽{stats.totalRevenue.toLocaleString()}</p>
              <p className={styles.statCardDescription}>Сумма всех оплаченных заказов.</p>
            </div>

            <div className={styles.statCard} style={{backgroundColor: '#fef3c7'}}> {/* bg-amber-50 */}
              <FaChartBar size={32} color="#f59e0b" /> {/* text-amber-600 */}
              <h3 className={styles.statCardTitle}>Общая прибыль</h3>
              <p className={styles.statCardValue}>₽{stats.totalProfit.toLocaleString()}</p>
              <p className={styles.statCardDescription}>Чистая прибыль по оплаченным заказам.</p>
            </div>

            <div className={styles.statCard} style={{backgroundColor: '#e0f2fe'}}> {/* bg-sky-50 */}
              <FaUsers size={32} color="#0ea5e9" /> {/* text-sky-600 */}
              <h3 className={styles.statCardTitle}>Новые пользователи</h3>
              <p className={styles.statCardValue}>{stats.newUsersLast30Days}</p>
              <p className={styles.statCardDescription}>За последние 30 дней.</p>
            </div>
            
            <div className={styles.statCard} style={{backgroundColor: '#fecaca'}}> {/* bg-red-50 */}
              <MdOutlineAccessTime size={32} color="#ef4444" /> {/* text-red-600 */}
              <h3 className={styles.statCardTitle}>Заказы в ожидании</h3>
              <p className={styles.statCardValue}>{stats.ordersByStatus['PENDING'] || 0}</p>
              <p className={styles.statCardDescription}>Ожидают подтверждения/оплаты.</p>
            </div>

            <div className={styles.statCard} style={{backgroundColor: '#d1fae5'}}> {/* bg-emerald-50 */}
              <MdCheckCircleOutline size={32} color="#10b981" /> {/* text-emerald-600 */}
              <h3 className={styles.statCardTitle}>Оплаченные заказы</h3>
              <p className={styles.statCardValue}>{stats.ordersByStatus['PAID'] || 0}</p>
              <p className={styles.statCardDescription}>Заказы, за которые получена оплата.</p>
            </div>

             <div className={styles.statCard} style={{backgroundColor: '#e6ffed'}}> {/* light green */}
              <FaTruck size={32} color="#059669" /> 
              <h3 className={styles.statCardTitle}>Отправленные заказы</h3>
              <p className={styles.statCardValue}>{stats.ordersByStatus['SHIPPED'] || 0}</p>
              <p className={styles.statCardDescription}>Заказы, находящиеся в пути.</p>
            </div>
          </div>
        )}

        <h3 className="text-xl font-bold text-gray-800 mb-6">Быстрые ссылки</h3>
        
        <div className={styles.quickLinksGrid}>
          <Link href="/admin/products" className={styles.quickLinkCard} style={{backgroundColor: '#eef2ff'}}>
            <h3 className={styles.quickLinkTitle}>Управление Товарами</h3>
            <p className={styles.quickLinkDescription}>Добавляйте, редактируйте и удаляйте товары.</p>
          </Link>

          <Link href="/admin/orders" className={styles.quickLinkCard} style={{backgroundColor: '#dcfce7'}}>
            <h3 className={styles.quickLinkTitle}>Управление Заказами</h3>
            <p className={styles.quickLinkDescription}>Обрабатывайте заказы, обновляйте статусы и трек-номера.</p>
          </Link>

          <Link href="/admin/users" className={styles.quickLinkCard} style={{backgroundColor: '#e0f2fe'}}>
            <h3 className={styles.quickLinkTitle}>Управление Пользователями</h3>
            <p className={styles.quickLinkDescription}>Настраивайте реферальные проценты и персональные скидки.</p>
          </Link>

          <Link href="/admin/stats" className={styles.quickLinkCard} style={{backgroundColor: '#fef3c7'}}>
            <h3 className={styles.quickLinkTitle}>Подробная Статистика</h3>
            <p className={styles.quickLinkDescription}>Просматривайте детальные отчеты и аналитику.</p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}