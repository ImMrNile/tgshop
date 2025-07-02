// pages/orders/index.ts

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { Order as PrismaOrder, OrderStatus } from '@prisma/client';
import styles from '../../styles/MyOrders.module.css'; // Можно использовать те же стили
import BottomNav from '../../components/BottomNav';
import { useAuth } from '../../components/AuthProvider'; // Импортируем useAuth

// Карта для перевода статусов на русский язык
const orderStatusRussianNames: Record<OrderStatus, string> = {
  PENDING: 'В ожидании',
  PAID: 'Оплачен',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменен',
  REFUNDED: 'Возвращен'
};

// Компонент страницы
export default function MyOrdersPage() {
  const { user, isAuthenticated, isLoading } = useAuth(); // Получаем user из контекста
  const [orders, setOrders] = useState<PrismaOrder[]>([]); // Используем PrismaOrder
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      // Ждем завершения загрузки аутентификации и наличия пользователя
      if (isLoading || !isAuthenticated || !user) {
        setLoading(isLoading); // Пока авторизация загружается, показываем загрузку
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('authToken'); // Получаем токен
        const res = await fetch(`/api/orders?userId=${user.id}`, { // Используем user.id из контекста и передаем токен
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        }); 
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Не удалось загрузить заказы');
        }
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, isAuthenticated, isLoading]); // Зависимости для useEffect: user, isAuthenticated, isLoading

  const renderContent = () => {
    if (loading) {
      return <p className={styles.centeredMessage}>Загрузка заказов...</p>;
    }

    // Если не авторизован после загрузки, показать сообщение
    if (!isAuthenticated) {
        return <p className={styles.centeredMessage}>Для просмотра заказов необходима авторизация.</p>;
    }

    if (error) {
      return <p className={styles.centeredMessage}>Ошибка: {error}</p>;
    }

    if (orders.length === 0) {
      return <p className={styles.centeredMessage}>У вас пока нет заказов.</p>;
    }

    return (
      <div className={styles.orderList}>
        {orders.map((order: PrismaOrder) => ( // Явное указание типа order
          <Link key={order.id} href={`/orders/${order.id}`} className={styles.orderCard}>
            <div className={styles.orderCardHeader}>
              <strong>Заказ #{order.id.substring(0, 8)}...</strong>
              <span className={styles.orderDate}>
                {new Date(order.createdAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div className={styles.orderCardBody}>
              <span>Сумма:</span>
              <strong>{Number(order.totalAmount).toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className={styles.orderCardFooter}>
              <span>Статус:</span>
              <strong className={`${styles.status} ${styles[order.status.toLowerCase()]}`}>
                {orderStatusRussianNames[order.status] || order.status}
              </strong>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className={styles.pageContainerWithNav}>
        <Head>
          <title>Мои заказы</title>
        </Head>
        <header className={styles.header}>
          <h1>Мои заказы</h1>
        </header>
        <main className={styles.mainContent}>
          {renderContent()}
        </main>
      </div>
      <BottomNav />
    </>
  );
}