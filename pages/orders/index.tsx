// pages/orders/index.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import styles from '../../styles/MyOrders.module.css';
import { Order, OrderStatus } from '@prisma/client';
import { FaArrowLeft, FaBoxOpen } from 'react-icons/fa';
import BottomNav from '../../components/BottomNav'; // <-- Импортируем навигацию

const orderStatusRussianNames: Record<OrderStatus, string> = {
  PENDING: 'В ожидании',
  PAID: 'Оплачен',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменен',
  REFUNDED: 'Возвращен'
};

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) throw new Error('Не удалось загрузить заказы');
        const data = await res.json();
        setOrders(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID': return styles.statusPaid;
      case 'SHIPPED': return styles.statusShipped;
      case 'DELIVERED': return styles.statusDelivered;
      case 'CANCELLED': return styles.statusCancelled;
      case 'PENDING':
      default:
        return styles.statusPending;
    }
  };

  return (
    <>
      <div className={styles.pageContainerWithNav}>
        <Head>
          <title>Мои заказы</title>
        </Head>
        <header className={styles.header}>
          {/* Сделаем кнопку "Назад" более умной: если есть куда, идем назад, иначе на главную */}
      <button onClick={() => router.asPath !== '/' ? router.back() : router.push('/')} className={styles.backButton}>
  <FaArrowLeft />
</button>
          <h1>Мои заказы</h1>
          <div></div>
        </header>
        <main className={styles.mainContent}>
          {loading ? (
            <p>Загрузка...</p>
          ) : orders.length === 0 ? (
            <div className={styles.emptyState}>
              <FaBoxOpen size={50} />
              <h2>У вас пока нет заказов</h2>
              <p>Самое время это исправить!</p>
              <button onClick={() => router.push('/')} className={styles.button}>Перейти в каталог</button>
            </div>
          ) : (
            <div className={styles.ordersList}>
              {orders.map(order => (
                <div key={order.id} className={styles.orderCard} onClick={() => router.push(`/orders/${order.id}`)}>
                  <div className={styles.cardHeader}>
                    <span>Заказ #{order.id.substring(0, 8)}...</span>
                    <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                      {orderStatusRussianNames[order.status]}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <p>Дата: {new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
                    <p>Сумма: <strong>{parseFloat(order.totalAmount.toString()).toLocaleString('ru-RU')} ₽</strong></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </>
  );
}