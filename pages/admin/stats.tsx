// pages/admin/stats.tsx
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import styles from '../../styles/AdminStats.module.css';
import { FaMoneyBillWave, FaUsers, FaBoxOpen, FaShoppingCart, FaChartLine } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stats {
  totalRevenue: number;
  netProfit: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  salesData: { date: string; revenue: number }[];
  topProducts: { name: string; count: number | null }[];
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <AdminLayout><div>Загрузка статистики...</div></AdminLayout>;
  if (!stats) return <AdminLayout><div>Не удалось загрузить данные.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className={styles.container}>
        <h1>Статистика</h1>
        
        {/* Основные показатели */}
        <div className={styles.grid}>
          <div className={`${styles.card} ${styles.profitCard}`}>
            <div className={styles.cardIcon}><FaChartLine /></div>
            <div className={styles.cardContent}>
              <p>Чистая прибыль</p>
              <h2>{stats.netProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</h2>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon}><FaMoneyBillWave /></div>
            <div className={styles.cardContent}>
              <p>Выручка</p>
              <h2>{stats.totalRevenue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</h2>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ background: '#dbeafe' }}><FaShoppingCart /></div>
            <div className={styles.cardContent}>
              <p>Всего заказов</p>
              <h2>{stats.totalOrders}</h2>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardIcon} style={{ background: '#c7d2fe' }}><FaUsers /></div>
            <div className={styles.cardContent}>
              <p>Всего пользователей</p>
              <h2>{stats.totalUsers}</h2>
            </div>
          </div>
        </div>

        {/* График продаж */}
        <div className={styles.chartCard}>
          <h3>Продажи за последние 30 дней</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.salesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₽`} />
              <Legend />
              <Bar dataKey="revenue" fill="#4f46e5" name="Выручка" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Топ товаров */}
        <div className={styles.topProductsCard}>
            <h3>Топ-5 продаваемых товаров</h3>
            <ol className={styles.productList}>
                {stats.topProducts.map((product, index) => (
                    <li key={index}>
                        <span>{product.name}</span>
                        <strong>{product.count} шт.</strong>
                    </li>
                ))}
            </ol>
        </div>
      </div>
    </AdminLayout>
  );
}