// pages/admin/orders.tsx
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import styles from '../../styles/AdminOrders.module.css';
import { Order, OrderStatus } from '@prisma/client'; // Импортируем Order и OrderStatus
import { useAuth } from '../../components/AuthProvider'; // Импортируем useAuth

type OrderWithUser = Order & {
  user: {
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null;
};

const orderStatusRussianNames: Record<OrderStatus, string> = { PENDING: 'В ожидании', PAID: 'Оплачен', PROCESSING: 'В обработке', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменен', REFUNDED: 'Возвращен' };

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isLoading, isAdmin } = useAuth(); // Получаем user, isLoading и isAdmin из контекста
  const [orders, setOrders] = useState<OrderWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Добавляем useEffect для проверки аутентификации и админ-статуса
  useEffect(() => {
    if (isLoading) {
      return; // Ждем завершения загрузки аутентификации
    }
    if (!user || !isAdmin) {
      router.push('/login'); // Или другая страница для неавторизованных/неадминов
    }
  }, [user, isLoading, isAdmin, router]);

  // fetchOrders теперь принимает только searchTerm
  const fetchOrders = useCallback(async (query: string) => {
    // Выполняем запрос только если пользователь является админом и аутентификация завершена
    if (!isLoading && isAdmin) { // Эта проверка уже есть в useEffect, но лучше дублировать и здесь
      setLoading(true);
      setError(null);
      try {
        // Убрали userId из запроса, теперь админ может видеть все заказы
        const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(query)}`); 
        if (!res.ok) throw new Error('Не удалось загрузить заказы');
        const data = await res.json();
        setOrders(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    }
  }, [isLoading, isAdmin]); // Зависимости: isLoading, isAdmin

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchOrders]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID': return styles.statusPaid;
      case 'SHIPPED': return styles.statusShipped;
      case 'DELIVERED': return styles.statusDelivered;
      case 'CANCELLED': return styles.statusCancelled;
      default: return styles.statusPending;
    }
  };
  
  return (
    <AdminLayout>
      <div className={styles.container}>
        <h1>Управление заказами</h1>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Поиск по ID, ФИО, телефону..."
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        {loading && <p>Загрузка...</p>}
        {error && <p className={styles.error}>{error}</p>}
        
        {!loading && !error && (
          <>
            {/* Таблица для десктопов */}
            <div className={styles.tableContainer}>
              <table className={styles.ordersTable}>
                <thead>
                  <tr>
                    <th>ID Заказа</th>
                    <th>Дата</th>
                    <th>Покупатель</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} onClick={() => router.push(`/admin/orders/${order.id}`)}>
                      <td>#{order.id.substring(0, 8)}...</td>
                      <td>{new Date(order.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td>{order.user?.username || `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'N/A'}</td>
                      <td>{parseFloat(order.totalAmount.toString()).toLocaleString('ru-RU')} ₽</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                          {orderStatusRussianNames[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Карточки для мобильных */}
            <div className={styles.cardsContainer}>
              {orders.map((order) => (
                <div key={order.id} className={styles.card} onClick={() => router.push(`/admin/orders/${order.id}`)}>
                    <div className={styles.cardRow}>
                        <span>Заказ:</span>
                        <strong>#{order.id.substring(0, 8)}...</strong>
                    </div>
                    <div className={styles.cardRow}>
                        <span>Клиент:</span>
                        <strong>{order.user?.username || `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'N/A'}</strong>
                    </div>
                    <div className={styles.cardRow}>
                        <span>Сумма:</span>
                        <strong>{parseFloat(order.totalAmount.toString()).toLocaleString('ru-RU')} ₽</strong>
                    </div>
                    <div className={styles.cardRow}>
                        <span>Статус:</span>
                        <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                            {orderStatusRussianNames[order.status]}
                        </span>
                    </div>
                </div>
              ))}
            </div>

            {orders.length === 0 && <p style={{padding: '1rem', textAlign: 'center'}}>Заказы не найдены.</p>}
          </>
        )}
      </div>
    </AdminLayout>
  );
}